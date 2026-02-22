// ============================================================
// Game Engine — Core state machine for game flow
// ============================================================

import type { Server, Socket } from "socket.io";
import type {
  Room,
  GameState,
  Player,
  PuzzleConfig,
  LevelConfig,
  PuzzleState,
  PlayerView,
  GlitchState,
} from "../../../shared/types.ts";
import {
  ServerEvents,
  type BriefingPayload,
  type PuzzleStartPayload,
  type PuzzleUpdatePayload,
  type PuzzleCompletedPayload,
  type GlitchUpdatePayload,
  type TimerUpdatePayload,
  type PhaseChangePayload,
  type VictoryPayload,
  type DefeatPayload,
  type GameStartedPayload,
  type PlayerReadyUpdatePayload,
} from "../../../shared/events.ts";
import { getLevel, getDefaultLevel } from "./config-loader.ts";
import { assignRoles } from "./role-assigner.ts";
import { GameTimer } from "./timer.ts";
import { getPuzzleHandler } from "../puzzles/puzzle-handler.ts";
import { getPlayersArray } from "./room-manager.ts";

// Active timers per room
// TODO: REDIS — store timer state in Redis for crash recovery
const roomTimers = new Map<string, GameTimer>();

/**
 * Start the game for a room
 */
export function startGame(io: Server, room: Room, startingPuzzleIndex: number = 0): void {
  const levelId = room.state.levelId;
  if (!levelId) {
    io.to(room.code).emit(ServerEvents.ROOM_ERROR, {
      message: "No level selected",
    });
    return;
  }

  const level = getLevel(levelId);
  if (!level) {
    console.error(`[Engine] Level config not found: ${levelId}`);
    return;
  }

  const players = getPlayersArray(room);
  if (players.length < level.min_players) {
    io.to(room.code).emit(ServerEvents.ROOM_ERROR, {
      message: `Need at least ${level.min_players} players (have ${players.length})`,
    });
    return;
  }

  // Initialize game state
  // TODO: REDIS — persist game state
  room.state.phase = "level_intro";
  room.state.levelId = level.id;
  room.state.currentPuzzleIndex = startingPuzzleIndex;
  room.state.totalPuzzles = level.puzzles.length;
  room.state.glitch = {
    value: 0,
    maxValue: level.glitch_max,
    decayRate: level.glitch_decay_rate,
  };
  room.state.timer = {
    totalSeconds: level.timer_seconds,
    remainingSeconds: level.timer_seconds,
    running: false,
  };
  room.state.startedAt = Date.now();
  room.state.completedPuzzles = [];
  room.state.readyPlayers = [];

  // Notify all players
  const startPayload: GameStartedPayload = {
    levelId: level.id,
    levelTitle: level.title,
    levelStory: level.story,
    levelIntroAudio: level.audio_cues.intro,
    backgroundMusic: level.audio_cues.background,
    themeCss: level.theme_css || ["themes/cyberpunk-greek.css"],
    totalPuzzles: level.puzzles.length,
    timerSeconds: level.timer_seconds,
  };
  io.to(room.code).emit(ServerEvents.GAME_STARTED, startPayload);

  // Start the global timer
  const timer = new GameTimer(
    level.timer_seconds,
    (timerState) => {
      room.state.timer = timerState;
      io.to(room.code).emit(ServerEvents.TIMER_UPDATE, { timer: timerState } as TimerUpdatePayload);
    },
    (_timerState) => {
      handleDefeat(io, room, "timer");
    }
  );
  roomTimers.set(room.code, timer);
  timer.start();

  // No initial briefing call — we wait for level_intro to finish
}

/**
 * Handle a player finishing the level intro
 */
export function handleLevelIntroComplete(io: Server, room: Room, playerId: string): void {
  if (room.state.phase !== "level_intro") return;

  if (!room.state.readyPlayers.includes(playerId)) {
    room.state.readyPlayers.push(playerId);
  }

  const players = getPlayersArray(room);
  if (room.state.readyPlayers.length >= players.length) {
    const level = getLevel(room.state.levelId);
    if (!level) return;

    room.state.readyPlayers = [];
    startPuzzleBriefing(io, room, level, room.state.currentPuzzleIndex);
  }
}

/**
 * Show briefing text before a puzzle starts
 */
function startPuzzleBriefing(io: Server, room: Room, level: LevelConfig, puzzleIndex: number): void {
  const puzzle = level.puzzles[puzzleIndex];
  if (!puzzle) {
    handleVictory(io, room);
    return;
  }

  room.state.phase = "briefing";
  room.state.currentPuzzleIndex = puzzleIndex;
  room.state.readyPlayers = [];

  const players = getPlayersArray(room);

  const briefingPayload: BriefingPayload = {
    puzzleTitle: puzzle.title,
    briefingText: puzzle.briefing,
    puzzleIndex,
    totalPuzzles: level.puzzles.length,
    totalRoomPlayers: players.length,
  };

  io.to(room.code).emit(ServerEvents.PHASE_CHANGE, {
    phase: "briefing",
    puzzleIndex,
  } as PhaseChangePayload);

  io.to(room.code).emit(ServerEvents.BRIEFING, briefingPayload);
}

/**
 * Handle a player marking themselves as ready
 */
export function handlePlayerReady(io: Server, room: Room, playerId: string): void {
  // Only matters during the briefing phase
  if (room.state.phase !== "briefing") return;

  if (!room.state.readyPlayers.includes(playerId)) {
    room.state.readyPlayers.push(playerId);
  }

  const players = getPlayersArray(room);
  
  io.to(room.code).emit(ServerEvents.PLAYER_READY_UPDATE, {
    readyCount: room.state.readyPlayers.length,
    totalPlayers: players.length,
  } as PlayerReadyUpdatePayload);

  if (room.state.readyPlayers.length >= players.length) {
    const level = getLevel(room.state.levelId);
    if (!level) return;
    
    // Clear ready players list
    room.state.readyPlayers = [];
    
    startPuzzle(io, room, level, room.state.currentPuzzleIndex);
  }
}

/**
 * Dev utility to jump to a specific puzzle
 */
export function jumpToPuzzle(io: Server, room: Room, puzzleIndex: number): void {
  const level = getLevel(room.state.levelId);
  if (!level) return;

  if (puzzleIndex < 0 || puzzleIndex >= level.puzzles.length) return;

  console.log(`[Engine] Jumping to puzzle ${puzzleIndex} in room ${room.code}`);
  
  // Clear any existing puzzle state
  room.state.puzzleState = null;
  
  startPuzzleBriefing(io, room, level, puzzleIndex);
}

/**
 * Initialize and start a puzzle
 */
function startPuzzle(io: Server, room: Room, level: LevelConfig, puzzleIndex: number): void {
  const puzzleConfig = level.puzzles[puzzleIndex];
  if (!puzzleConfig) return;

  const handler = getPuzzleHandler(puzzleConfig.type);
  if (!handler) {
    console.error(`[Engine] No handler for puzzle type: ${puzzleConfig.type}`);
    return;
  }

  const players = getPlayersArray(room);

  // Assign roles for this puzzle
  const roles = assignRoles(players, puzzleConfig);
  room.state.roleAssignments = roles;

  // Initialize puzzle state
  const puzzleState = handler.init(players, puzzleConfig);
  room.state.puzzleState = puzzleState;
  room.state.phase = "playing";

  // TODO: REDIS — persist puzzle state

  // Send each player their role-specific view
  io.to(room.code).emit(ServerEvents.PHASE_CHANGE, {
    phase: "playing",
    puzzleIndex,
  } as PhaseChangePayload);

  io.to(room.code).emit(ServerEvents.ROLES_ASSIGNED, { roles });

  for (const player of players) {
    const role = roles.find((r) => r.playerId === player.id);
    if (!role) continue;

    const playerView = handler.getPlayerView(puzzleState, player.id, role.role, puzzleConfig);

    const socket = getPlayerSocket(io, player.id);
    if (socket) {
      socket.emit(ServerEvents.PUZZLE_START, {
        puzzleId: puzzleConfig.id,
        puzzleType: puzzleConfig.type,
        puzzleTitle: puzzleConfig.title,
        roles,
        playerView,
      } as PuzzleStartPayload);
    }
  }

  console.log(`[Engine] Puzzle ${puzzleIndex + 1}/${level.puzzles.length} started: ${puzzleConfig.title}`);
}

/**
 * Handle a puzzle action from a player
 */
export function handlePuzzleAction(
  io: Server,
  room: Room,
  playerId: string,
  action: string,
  data: Record<string, unknown>
): void {
  if (room.state.phase !== "playing" || !room.state.puzzleState) return;

  const level = getLevel(room.state.levelId);
  if (!level) return;

  const puzzleConfig = level.puzzles[room.state.currentPuzzleIndex];
  if (!puzzleConfig) return;

  const handler = getPuzzleHandler(puzzleConfig.type);
  if (!handler) return;

  // Process the action
  const result = handler.handleAction(room.state.puzzleState, playerId, action, data);
  room.state.puzzleState = result.state;

  // TODO: REDIS — persist updated puzzle state

  // Apply glitch penalty
  if (result.glitchDelta > 0) {
    addGlitch(io, room, result.glitchDelta);
  }

  // Send updated views to all players
  const players = getPlayersArray(room);
  for (const player of players) {
    const role = room.state.roleAssignments.find((r) => r.playerId === player.id);
    if (!role) continue;

    const playerView = handler.getPlayerView(
      room.state.puzzleState,
      player.id,
      role.role,
      puzzleConfig
    );

    const socket = getPlayerSocket(io, player.id);
    if (socket) {
      socket.emit(ServerEvents.PUZZLE_UPDATE, {
        puzzleId: puzzleConfig.id,
        playerView,
      } as PuzzleUpdatePayload);
    }
  }

  // Check win condition
  if (handler.checkWin(room.state.puzzleState)) {
    handlePuzzleComplete(io, room, level);
  }
}

/**
 * Handle puzzle completion — advance to next or victory
 */
function handlePuzzleComplete(io: Server, room: Room, level: LevelConfig): void {
  const puzzleConfig = level.puzzles[room.state.currentPuzzleIndex];
  if (puzzleConfig) {
    room.state.completedPuzzles.push(puzzleConfig.id);
  }

  const nextIndex = room.state.currentPuzzleIndex + 1;

  io.to(room.code).emit(ServerEvents.PUZZLE_COMPLETED, {
    puzzleId: puzzleConfig?.id ?? "",
    puzzleIndex: room.state.currentPuzzleIndex,
    totalPuzzles: level.puzzles.length,
  } as PuzzleCompletedPayload);

  // Transition pause before next puzzle
  room.state.phase = "puzzle_transition";
  io.to(room.code).emit(ServerEvents.PHASE_CHANGE, {
    phase: "puzzle_transition",
    puzzleIndex: room.state.currentPuzzleIndex,
  } as PhaseChangePayload);

  setTimeout(() => {
    if (nextIndex >= level.puzzles.length) {
      handleVictory(io, room);
    } else {
      startPuzzleBriefing(io, room, level, nextIndex);
    }
  }, 3000);
}

/**
 * Add glitch and check for defeat
 */
function addGlitch(io: Server, room: Room, delta: number): void {
  room.state.glitch.value = Math.min(
    room.state.glitch.value + delta,
    room.state.glitch.maxValue
  );

  // TODO: REDIS — persist glitch state

  io.to(room.code).emit(ServerEvents.GLITCH_UPDATE, {
    glitch: room.state.glitch,
  } as GlitchUpdatePayload);

  // Check for glitch defeat
  if (room.state.glitch.value >= room.state.glitch.maxValue) {
    handleDefeat(io, room, "glitch");
  }
}

/**
 * Handle victory
 */
function handleVictory(io: Server, room: Room): void {
  room.state.phase = "victory";
  const timer = roomTimers.get(room.code);
  timer?.stop();

  const elapsed = room.state.startedAt
    ? Math.floor((Date.now() - room.state.startedAt) / 1000)
    : 0;

  io.to(room.code).emit(ServerEvents.PHASE_CHANGE, {
    phase: "victory",
    puzzleIndex: room.state.currentPuzzleIndex,
  } as PhaseChangePayload);

  io.to(room.code).emit(ServerEvents.VICTORY, {
    elapsedSeconds: elapsed,
    glitchFinal: room.state.glitch.value,
    puzzlesCompleted: room.state.completedPuzzles.length,
  } as VictoryPayload);

  console.log(`[Engine] VICTORY! Room ${room.code} completed in ${elapsed}s`);
  cleanupRoom(room.code);
}

/**
 * Handle defeat
 */
function handleDefeat(io: Server, room: Room, reason: "timer" | "glitch"): void {
  room.state.phase = "defeat";
  const timer = roomTimers.get(room.code);
  timer?.stop();

  io.to(room.code).emit(ServerEvents.PHASE_CHANGE, {
    phase: "defeat",
    puzzleIndex: room.state.currentPuzzleIndex,
  } as PhaseChangePayload);

  io.to(room.code).emit(ServerEvents.DEFEAT, {
    reason,
    puzzlesCompleted: room.state.completedPuzzles.length,
    puzzleReachedIndex: room.state.currentPuzzleIndex,
  } as DefeatPayload);

  console.log(`[Engine] DEFEAT! Room ${room.code} — reason: ${reason}`);
  cleanupRoom(room.code);
}

/**
 * Cleanup room resources
 */
function cleanupRoom(roomCode: string): void {
  const timer = roomTimers.get(roomCode);
  if (timer) {
    timer.destroy();
    roomTimers.delete(roomCode);
  }
}

/**
 * Get a socket for a player (searches all connected sockets)
 */
function getPlayerSocket(io: Server, playerId: string): Socket | undefined {
  const sockets = io.sockets.sockets;
  return sockets.get(playerId);
}

/**
 * Get all player views (for debug mode)
 */
export function getAllPlayerViews(room: Room): PlayerView[] {
  if (!room.state.puzzleState) return [];

  const level = getLevel(room.state.levelId);
  if (!level) return [];

  const puzzleConfig = level.puzzles[room.state.currentPuzzleIndex];
  if (!puzzleConfig) return [];

  const handler = getPuzzleHandler(puzzleConfig.type);
  if (!handler) return [];

  const views: PlayerView[] = [];
  const roles = room.state.roleAssignments;

  // Generate one view per unique role
  const seenRoles = new Set<string>();
  for (const role of roles) {
    if (seenRoles.has(role.role)) continue;
    seenRoles.add(role.role);

    views.push(
      handler.getPlayerView(room.state.puzzleState, role.playerId, role.role, puzzleConfig)
    );
  }

  return views;
}
