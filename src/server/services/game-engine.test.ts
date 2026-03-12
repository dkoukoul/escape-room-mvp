import { describe, expect, test, mock, beforeEach } from "bun:test";

// 1. Define common level config for all tests
const mockLevel = {
  id: "level1",
  title: "Level 1",
  story: "Story",
  min_players: 1,
  glitch_max: 100,
  max_players: 4,
  glitch_decay_rate: 1,
  timer_seconds: 300,
  puzzles: [
    { 
      id: "p1", 
      type: "collaborative_wiring", 
      title: "Wires", 
      briefing: "Fix the wires",
      audio_cues: { start: "start.mp3" }
    },
    { 
      id: "p2", 
      type: "asymmetric_symbols", 
      title: "Symbols", 
      briefing: "Match symbols",
    }
  ],
  audio_cues: {
    intro: "intro.mp3",
    background: "bg.mp3"
  }
};

// 2. Mock Modules BEFORE importing the engine
mock.module("../utils/config-loader.ts", () => ({
  getLevel: mock((id) => mockLevel),
  getDefaultLevel: mock(() => mockLevel),
}));

mock.module("./room-manager.ts", () => ({
  getPlayersArray: mock((room) => Array.from(room.players.values())),
  persistRoom: mock(() => Promise.resolve()),
  getAllRooms: mock(() => []),
}));

mock.module("./role-assigner.ts", () => ({
  assignRoles: mock((players, puzzle) => players.map((p: { id: any; name: any; }) => ({
    playerId: p.id,
    playerName: p.name,
    role: "builder"
  }))),
}));

// Mock the puzzle handler module
const mockHandler = {
  init: mock(() => ({ status: PuzzleStatus.ACTIVE, data: {} })),
  getPlayerView: mock(() => ({ playerId: "p1", role: "builder", viewData: {} })),
  handleAction: mock(() => ({ state: { status: PuzzleStatus.ACTIVE }, glitchDelta: 0 })),
  checkWin: mock(() => false),
};

mock.module("../puzzles/puzzle-handler.ts", () => ({
  getPuzzleHandler: mock(() => mockHandler),
}));

// Mock the GameTimer class
const mockTimerStart = mock();
const mockTimerStop = mock();
const mockTimerDestroy = mock();

mock.module("../utils/timer.ts", () => ({
  GameTimer: class {
    constructor(public total: number, public onTick: any, public onExpire: any) {}
    start = mockTimerStart;
    stop = mockTimerStop;
    destroy = mockTimerDestroy;
    setRemainingSeconds = mock();
  },
}));

mock.module("../repositories/postgres-service.ts", () => ({
  PostgresService: class {
    createGameScore = mock(() => Promise.resolve());
  },
}));

mock.module("../utils/logger.ts", () => ({
  default: {
    info: mock(),
    error: mock(),
    warn: mock(),
    debug: mock(),
    gameEvent: mock(),
  },
}));

// 3. Import Game Engine and related types
import { 
  startGame, 
  handleLevelIntroComplete, 
  handlePlayerReady, 
  handlePuzzleAction,
  handleVictory,
  jumpToPuzzle,
  syncPlayer,
  getAllPlayerViews
} from './game-engine.ts';
import { ServerEvents } from "../../../shared/events.ts";
import { type Room, type Player, GamePhase, PuzzleStatus, PuzzleType } from "../../../shared/types.ts";

function createMockRoom(): Room {
  const players = new Map<string, Player>();
  players.set("player1", { 
    id: "player1", 
    name: "Alice", 
    connected: true, 
    roomCode: "ABCD", 
    role: null, 
    isHost: true 
  });
  const room: Room = {
      code: "ABCD",
      hostId: "player1",
      players: players,
      createdAt: Date.now(),
      state: {
          phase: GamePhase.LOBBY,
          levelId: "level1",
          currentPuzzleIndex: 0,
          totalPuzzles: 2,
          glitch: { value: 0, maxValue: 100, decayRate: 1 },
          timer: { totalSeconds: 300, remainingSeconds: 300, running: false },
          completedPuzzles: [],
          readyPlayers: [],
          roleAssignments: [],
          puzzleState: null,
          startedAt: null,
      }
  }
  return room;
}

function createMockServer() {
  const emit = mock();
  const toMock = { emit: emit };
  const socketEmit = mock();
  return {
    to: mock(() => toMock),
    emit: emit,
    sockets: {
      sockets: new Map([
        ["player1", { emit: socketEmit, id: "player1" }]
      ])
    }
  } as any;
}

describe("Game Engine", () => {
  let io: any;
  let room: Room;

  beforeEach(() => {
    io = createMockServer();
    room = createMockRoom();
    mockTimerStart.mockClear();
    mockTimerStop.mockClear();
    
    // Reset handler mocks
    mockHandler.init.mockClear();
    mockHandler.handleAction.mockClear();
    mockHandler.checkWin.mockClear();
  });

  describe("startGame", () => {
    test("should initialize game state and start timer", async () => {
      await startGame(io, room);

      expect(room.state.phase).toBe(GamePhase.LEVEL_INTRO);
      expect(room.state.levelId).toBe("level1");
      expect(room.state.startedAt).toBeDefined();
      expect(mockTimerStart).toHaveBeenCalled();
      
      expect(io.to).toHaveBeenCalledWith("ABCD");
      expect(io.to().emit).toHaveBeenCalledWith(ServerEvents.GAME_STARTED, expect.objectContaining({
        levelId: "level1",
        totalPuzzles: 2
      }));
    });

    test("should emit error if players < min_players", async () => {
      const { getLevel } = require("../utils/config-loader.ts");
      getLevel.mockReturnValueOnce({ ...mockLevel, min_players: 5 });

      await startGame(io, room);

      expect(io.to().emit).toHaveBeenCalledWith(ServerEvents.ROOM_ERROR, expect.objectContaining({
        message: expect.stringContaining("Need at least 5 players")
      }));
    });
  });

  describe("handleLevelIntroComplete", () => {
    test("should transition to briefing when all players are ready", async () => {
      room.state.phase = GamePhase.LEVEL_INTRO;
      
      await handleLevelIntroComplete(io, room, "player1");

      expect(room.state.phase).toBe(GamePhase.BRIEFING as any);
      expect(io.to().emit).toHaveBeenCalledWith(ServerEvents.PHASE_CHANGE, expect.objectContaining({
        phase: GamePhase.BRIEFING,
        puzzleIndex: 0
      }));
      expect(io.to().emit).toHaveBeenCalledWith(ServerEvents.BRIEFING, expect.any(Object));
    });

    test("should wait for all players if more than one", async () => {
      room.players.set("player2", { id: "player2", name: "Bob", connected: true } as any);
      room.state.phase = GamePhase.LEVEL_INTRO;

      await handleLevelIntroComplete(io, room, "player1");
      
      expect(room.state.phase).toBe(GamePhase.LEVEL_INTRO);
      expect(room.state.readyPlayers).toContain("player1");
      expect(room.state.readyPlayers).not.toContain("player2");
    });
  });

  describe("handlePlayerReady", () => {
    test("should transition to playing when all players are ready in briefing", () => {
      room.state.phase = GamePhase.BRIEFING;
      room.state.currentPuzzleIndex = 0;
      
      handlePlayerReady(io, room, "player1");
      
      expect(room.state.phase).toBe(GamePhase.PLAYING as any);
      expect(io.to().emit).toHaveBeenCalledWith(ServerEvents.PHASE_CHANGE, expect.objectContaining({
        phase: "playing"
      }));
      expect(io.to().emit).toHaveBeenCalledWith(ServerEvents.ROLES_ASSIGNED, expect.any(Object));
      
      const playerSocket = io.sockets.sockets.get("player1");
      expect(playerSocket.emit).toHaveBeenCalledWith(ServerEvents.PUZZLE_START, expect.any(Object));
    });
  });

  describe("handlePuzzleAction", () => {
    test("should update puzzle state and check for win", async () => {
      room.state.phase = GamePhase.PLAYING;
      room.state.puzzleState = { puzzleId: "p1", type: PuzzleType.COLLABORATIVE_WIRING, status: PuzzleStatus.ACTIVE, data: {} };
      room.state.roleAssignments = [{ playerId: "player1", playerName: "Alice", role: "builder" }];
      
      mockHandler.handleAction.mockReturnValue({ state: { status: PuzzleStatus.ACTIVE }, glitchDelta: 0 });
      mockHandler.checkWin.mockReturnValue(true);

      await handlePuzzleAction(io, room, "player1", "click", { x: 10 });
      
      expect(room.state.completedPuzzles).toContain("p1");
      expect(room.state.phase).toBe(GamePhase.PUZZLE_TRANSITION as any);
      expect(io.to().emit).toHaveBeenCalledWith(ServerEvents.PUZZLE_COMPLETED, expect.any(Object));
    });

    test("should increase glitch if handler returns glitch delta", async () => {
      mockHandler.handleAction.mockReturnValue({ state: { status: PuzzleStatus.ACTIVE }, glitchDelta: 20 });
      mockHandler.checkWin.mockReturnValue(false);
      
      room.state.phase = GamePhase.PLAYING;
      room.state.puzzleState = { puzzleId: "p1", type: PuzzleType.COLLABORATIVE_WIRING, status: PuzzleStatus.ACTIVE, data: {} };
      room.state.roleAssignments = [{ playerId: "player1", playerName: "Alice", role: "builder" }];

      await handlePuzzleAction(io, room, "player1", "error", {});
      
      expect(room.state.glitch.value).toBe(20);
      expect(io.to().emit).toHaveBeenCalledWith(ServerEvents.GLITCH_UPDATE, expect.any(Object));
    });
  });

  describe("jumpToPuzzle", () => {
    test("should jump to the specified puzzle index", async () => {
      room.state.phase = GamePhase.PLAYING;
      room.state.currentPuzzleIndex = 0;

      await jumpToPuzzle(io, room, 1);

      expect(room.state.currentPuzzleIndex).toBe(1);
      expect(room.state.phase).toBe(GamePhase.BRIEFING as any);
      expect(io.to().emit).toHaveBeenCalledWith(ServerEvents.PHASE_CHANGE, expect.objectContaining({
        puzzleIndex: 1
      }));
    });
  });

  describe("handleVictory", () => {
    test("should stop timer and transition to victory phase", async () => {
      room.state.startedAt = Date.now() - 5000;
      room.state.completedPuzzles = ["p1", "p2"];
      room.state.glitch.value = 10;
      
      await handleVictory(io, room, mockLevel);
      
      expect(room.state.phase).toBe(GamePhase.VICTORY);
      expect(mockTimerStop).toHaveBeenCalled();
      expect(io.to().emit).toHaveBeenCalledWith(ServerEvents.VICTORY, expect.objectContaining({
        puzzlesCompleted: 2,
        glitchFinal: 10
      }));
    });
  });

  describe("syncPlayer", () => {
    test("should emit current game state to a specific socket", () => {
      const socket = { emit: mock(), id: "player1" } as any;
      
      room.state.phase = GamePhase.PLAYING;
      room.state.currentPuzzleIndex = 0;
      room.state.puzzleState = { puzzleId: "p1", type: PuzzleType.COLLABORATIVE_WIRING, status: PuzzleStatus.ACTIVE, data: {} };
      room.state.roleAssignments = [{ playerId: "player1", playerName: "Alice", role: "builder" }];

      syncPlayer(io, room, socket);

      expect(socket.emit).toHaveBeenCalledWith(ServerEvents.GAME_STARTED, expect.any(Object));
      expect(socket.emit).toHaveBeenCalledWith(ServerEvents.PHASE_CHANGE, expect.objectContaining({
        phase: "playing"
      }));
      expect(socket.emit).toHaveBeenCalledWith(ServerEvents.PUZZLE_START, expect.any(Object));
    });
  });

  describe("getAllPlayerViews", () => {
    test("should return views for each unique role", () => {
      room.state.puzzleState = { puzzleId: "p1", type: PuzzleType.COLLABORATIVE_WIRING, status: PuzzleStatus.ACTIVE, data: {} };
      room.state.roleAssignments = [
        { playerId: "player1", role: "builder", playerName: "Alice" },
        { playerId: "player2", role: "builder", playerName: "Bob" },
        { playerId: "player3", role: "navigator", playerName: "Charlie" }
      ];

      const views = getAllPlayerViews(room);
      expect(views.length).toBe(2); // builder and navigator
    });
  });
});