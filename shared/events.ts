// ============================================================
// Project ODYSSEY — Socket.io Event Definitions
// ============================================================
// No magic strings — every event name and payload is typed here.

import type {
  Player,
  GameState,
  PlayerView,
  RoleAssignment,
  GlitchState,
  TimerState,
  DebugState,
} from "./types.ts";

// ---- Event Names ----

export const ClientEvents = {
  // Lobby
  CREATE_ROOM: "room:create",
  JOIN_ROOM: "room:join",
  LEAVE_ROOM: "room:leave",
  START_GAME: "game:start",

  // Gameplay
  PUZZLE_ACTION: "puzzle:action",
  REQUEST_HINT: "puzzle:hint",
  PLAYER_READY: "game:ready",

  // Debug
  TOGGLE_DEBUG: "debug:toggle",
  JUMP_TO_PUZZLE: "debug:jump",
} as const;

export const ServerEvents = {
  // Lobby
  ROOM_CREATED: "room:created",
  ROOM_JOINED: "room:joined",
  ROOM_LEFT: "room:left",
  PLAYER_LIST_UPDATE: "room:players",
  ROOM_ERROR: "room:error",

  // Game Flow
  GAME_STARTED: "game:started",
  PHASE_CHANGE: "game:phase",
  BRIEFING: "game:briefing",
  PUZZLE_START: "puzzle:start",
  PUZZLE_UPDATE: "puzzle:update",
  PUZZLE_COMPLETED: "puzzle:completed",
  PUZZLE_TRANSITION: "puzzle:transition",
  PLAYER_READY_UPDATE: "game:ready_update",

  // Shared State
  ROLES_ASSIGNED: "roles:assigned",
  GLITCH_UPDATE: "glitch:update",
  TIMER_UPDATE: "timer:update",
  PLAYER_VIEW: "player:view",

  // Results
  VICTORY: "game:victory",
  DEFEAT: "game:defeat",

  // Debug
  DEBUG_UPDATE: "debug:update",
} as const;

// ---- Client → Server Payloads ----

export interface CreateRoomPayload {
  playerName: string;
}

export interface JoinRoomPayload {
  roomCode: string;
  playerName: string;
}

export interface StartGamePayload {
  startingPuzzleIndex?: number;
}

export interface PuzzleActionPayload {
  puzzleId: string;
  action: string;       // e.g., "capture_letter", "tap_color", "toggle_switch", etc.
  data: Record<string, unknown>;
}

export interface JumpToPuzzlePayload {
  puzzleIndex: number;
}

// ---- Server → Client Payloads ----

export interface RoomCreatedPayload {
  roomCode: string;
  player: Player;
}

export interface RoomJoinedPayload {
  roomCode: string;
  player: Player;
  players: Player[];
}

export interface RoomErrorPayload {
  message: string;
}

export interface PlayerListPayload {
  players: Player[];
}

export interface GameStartedPayload {
  levelId: string;
  levelTitle: string;
  totalPuzzles: number;
  timerSeconds: number;
}

export interface PhaseChangePayload {
  phase: GameState["phase"];
  puzzleIndex: number;
}

export interface BriefingPayload {
  puzzleTitle: string;
  briefingText: string;
  puzzleIndex: number;
  totalPuzzles: number;
  totalRoomPlayers: number;
}

export interface PlayerReadyUpdatePayload {
  readyCount: number;
  totalPlayers: number;
}

export interface PuzzleStartPayload {
  puzzleId: string;
  puzzleType: string;
  puzzleTitle: string;
  roles: RoleAssignment[];
  playerView: PlayerView;
}

export interface PuzzleUpdatePayload {
  puzzleId: string;
  playerView: PlayerView;
}

export interface PuzzleCompletedPayload {
  puzzleId: string;
  puzzleIndex: number;
  totalPuzzles: number;
}

export interface GlitchUpdatePayload {
  glitch: GlitchState;
}

export interface TimerUpdatePayload {
  timer: TimerState;
}

export interface VictoryPayload {
  elapsedSeconds: number;
  glitchFinal: number;
  puzzlesCompleted: number;
}

export interface DefeatPayload {
  reason: "timer" | "glitch";
  puzzlesCompleted: number;
  puzzleReachedIndex: number;
}
