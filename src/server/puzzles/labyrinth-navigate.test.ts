import { describe, expect, test } from "bun:test";
import { labyrinthNavigateHandler } from "./labyrinth-navigate.ts";
import { type Player, type PuzzleConfig, type PuzzleState, PuzzleType, PuzzleStatus } from "../../../shared/types.ts";

// 5x5 grid for testing:
// [S] [.] [W] [.] [.]
// [.] [W] [.] [.] [.]
// [.] [.] [T] [.] [L]
// [.] [W] [.] [W] [.]
// [.] [.] [.] [.] [E]
//
// S=start(0,0), W=wall, T=trap, L=landmark, E=exit

const testGrid = [
  [0, 0, 1, 0, 0],
  [0, 1, 0, 0, 0],
  [0, 0, 2, 0, 4],
  [0, 1, 0, 1, 0],
  [0, 0, 0, 0, 3],
];

const mockConfig: PuzzleConfig = {
  id: "test_labyrinth",
  type: PuzzleType.LABYRINTH_NAVIGATE,
  title: "Test Labyrinth",
  briefing: "Test briefing",
  layout: {
    roles: [
      { name: "Χαρτογράφος", count: 1, description: "Map viewer" },
      { name: "Δρομέας", count: "remaining", description: "Runner" },
    ],
  },
  data: {
    rows: 5,
    cols: 5,
    grid: testGrid,
    start_position: [0, 0],
    exit_position: [4, 4],
    landmarks: [{ row: 2, col: 4, label: "Στήλη" }],
    traps: [[2, 2]],
    ping_delay_ms: 2000,
    visibility_radius: 1,
  },
  glitch_penalty: 6,
};

const mockPlayers: Player[] = [
  { id: "p1", name: "Alice", roomCode: "test", role: "Χαρτογράφος", isHost: true, connected: true },
  { id: "p2", name: "Bob", roomCode: "test", role: "Δρομέας", isHost: false, connected: true },
];

describe("labyrinthNavigateHandler", () => {
  describe("init", () => {
    test("should initialize puzzle state correctly", () => {
      const state = labyrinthNavigateHandler.init(mockPlayers, mockConfig);

      expect(state.puzzleId).toBe("test_labyrinth");
      expect(state.type).toBe(PuzzleType.LABYRINTH_NAVIGATE);
      expect(state.status).toBe(PuzzleStatus.ACTIVE);
      expect(state.data.rows).toBe(5);
      expect(state.data.cols).toBe(5);
      expect(state.data.reachedExit).toBe(false);
    });

    test("should place runners at start position", () => {
      const state = labyrinthNavigateHandler.init(mockPlayers, mockConfig);
      const positions = state.data.runnerPositions as Record<string, { row: number; col: number }>;

      // Both players get positions (runner filtering happens at init time)
      expect(Object.keys(positions).length).toBeGreaterThan(0);
      for (const pos of Object.values(positions)) {
        expect(pos.row).toBe(0);
        expect(pos.col).toBe(0);
      }
    });

    test("should initialize empty ping history", () => {
      const state = labyrinthNavigateHandler.init(mockPlayers, mockConfig);
      const pings = state.data.pingHistory as unknown[];
      expect(pings).toEqual([]);
    });
  });

  describe("handleAction — move", () => {
    function createState(): PuzzleState {
      return {
        puzzleId: "test_labyrinth",
        type: PuzzleType.LABYRINTH_NAVIGATE,
        status: PuzzleStatus.ACTIVE,
        data: {
          grid: testGrid,
          rows: 5,
          cols: 5,
          runnerPositions: { p2: { row: 0, col: 0 } },
          exitPosition: { row: 4, col: 4 },
          landmarks: [{ row: 2, col: 4, label: "Στήλη" }],
          traps: [{ row: 2, col: 2 }],
          pingHistory: [],
          pingDelayMs: 2000,
          visibilityRadius: 1,
          reachedExit: false,
        } as unknown as Record<string, unknown>,
      };
    }

    test("should move runner on valid floor tile", () => {
      const state = createState();
      const { state: newState, glitchDelta } = labyrinthNavigateHandler.handleAction(
        state, "p2", "move", { direction: "down" }
      );

      const positions = newState.data.runnerPositions as Record<string, { row: number; col: number }>;
      expect(positions.p2.row).toBe(1);
      expect(positions.p2.col).toBe(0);
      expect(glitchDelta).toBe(0);
    });

    test("should not move into a wall", () => {
      const state = createState();
      // Move right twice to reach (0,1), then try to move down into wall at (1,1)
      const { state: s1 } = labyrinthNavigateHandler.handleAction(state, "p2", "move", { direction: "right" });
      const { state: s2, glitchDelta } = labyrinthNavigateHandler.handleAction(s1, "p2", "move", { direction: "down" });

      const positions = s2.data.runnerPositions as Record<string, { row: number; col: number }>;
      expect(positions.p2.row).toBe(0);
      expect(positions.p2.col).toBe(1);
      expect(glitchDelta).toBe(0);
    });

    test("should not move out of bounds", () => {
      const state = createState();
      const { state: newState, glitchDelta } = labyrinthNavigateHandler.handleAction(
        state, "p2", "move", { direction: "up" }
      );

      const positions = newState.data.runnerPositions as Record<string, { row: number; col: number }>;
      expect(positions.p2.row).toBe(0);
      expect(positions.p2.col).toBe(0);
      expect(glitchDelta).toBe(0);
    });

    test("should apply glitch when stepping on a trap", () => {
      // Place runner at (2,1) so moving right hits trap at (2,2)
      const state = createState();
      (state.data as any).runnerPositions = { p2: { row: 2, col: 1 } };

      const { state: newState, glitchDelta } = labyrinthNavigateHandler.handleAction(
        state, "p2", "move", { direction: "right" }
      );

      const positions = newState.data.runnerPositions as Record<string, { row: number; col: number }>;
      expect(positions.p2.row).toBe(2);
      expect(positions.p2.col).toBe(2);
      expect(glitchDelta).toBe(6);
    });

    test("should set reachedExit when runner reaches exit", () => {
      const state = createState();
      (state.data as any).runnerPositions = { p2: { row: 4, col: 3 } };

      const { state: newState } = labyrinthNavigateHandler.handleAction(
        state, "p2", "move", { direction: "right" }
      );

      expect(newState.data.reachedExit).toBe(true);
    });

    test("should ignore move for unknown player", () => {
      const state = createState();
      const { state: newState, glitchDelta } = labyrinthNavigateHandler.handleAction(
        state, "unknown", "move", { direction: "down" }
      );

      expect(glitchDelta).toBe(0);
    });

    test("should ignore invalid direction", () => {
      const state = createState();
      const { state: newState, glitchDelta } = labyrinthNavigateHandler.handleAction(
        state, "p2", "move", { direction: "diagonal" }
      );

      const positions = newState.data.runnerPositions as Record<string, { row: number; col: number }>;
      expect(positions.p2.row).toBe(0);
      expect(positions.p2.col).toBe(0);
      expect(glitchDelta).toBe(0);
    });
  });

  describe("handleAction — ping", () => {
    test("should add a ping to history", () => {
      const state: PuzzleState = {
        puzzleId: "test",
        type: PuzzleType.LABYRINTH_NAVIGATE,
        status: PuzzleStatus.ACTIVE,
        data: {
          grid: testGrid,
          rows: 5, cols: 5,
          runnerPositions: { p2: { row: 1, col: 0 } },
          exitPosition: { row: 4, col: 4 },
          landmarks: [], traps: [],
          pingHistory: [],
          pingDelayMs: 2000, visibilityRadius: 1,
          reachedExit: false,
        } as unknown as Record<string, unknown>,
      };

      const { state: newState, glitchDelta } = labyrinthNavigateHandler.handleAction(
        state, "p2", "ping", {}
      );

      const pings = newState.data.pingHistory as { row: number; col: number; timestamp: number }[];
      expect(pings.length).toBe(1);
      expect(pings[0].row).toBe(1);
      expect(pings[0].col).toBe(0);
      expect(glitchDelta).toBe(0);
    });
  });

  describe("checkWin", () => {
    test("should return true when exit is reached", () => {
      const state: PuzzleState = {
        puzzleId: "test",
        type: PuzzleType.LABYRINTH_NAVIGATE,
        status: PuzzleStatus.ACTIVE,
        data: { reachedExit: true } as unknown as Record<string, unknown>,
      };
      expect(labyrinthNavigateHandler.checkWin(state)).toBe(true);
    });

    test("should return false when exit is not reached", () => {
      const state: PuzzleState = {
        puzzleId: "test",
        type: PuzzleType.LABYRINTH_NAVIGATE,
        status: PuzzleStatus.ACTIVE,
        data: { reachedExit: false } as unknown as Record<string, unknown>,
      };
      expect(labyrinthNavigateHandler.checkWin(state)).toBe(false);
    });
  });

  describe("getPlayerView", () => {
    function createFullState(): PuzzleState {
      return {
        puzzleId: "test_labyrinth",
        type: PuzzleType.LABYRINTH_NAVIGATE,
        status: PuzzleStatus.ACTIVE,
        data: {
          grid: testGrid,
          rows: 5, cols: 5,
          runnerPositions: { p2: { row: 2, col: 2 } },
          exitPosition: { row: 4, col: 4 },
          landmarks: [{ row: 2, col: 4, label: "Στήλη" }],
          traps: [{ row: 2, col: 2 }],
          pingHistory: [
            { row: 1, col: 0, timestamp: Date.now() - 5000 }, // old ping (visible)
            { row: 2, col: 2, timestamp: Date.now() },        // new ping (not yet visible)
          ],
          pingDelayMs: 2000,
          visibilityRadius: 1,
          reachedExit: false,
        } as unknown as Record<string, unknown>,
      };
    }

    test("Cartographer should see full grid and delayed pings", () => {
      const state = createFullState();
      const view = labyrinthNavigateHandler.getPlayerView(state, "p1", "Χαρτογράφος", mockConfig);

      expect(view.role).toBe("Χαρτογράφος");
      expect(view.viewData.grid).toEqual(testGrid);
      expect(view.viewData.rows).toBe(5);
      expect(view.viewData.cols).toBe(5);
      expect(view.viewData.exitPosition).toEqual({ row: 4, col: 4 });
      expect(view.viewData.landmarks).toEqual([{ row: 2, col: 4, label: "Στήλη" }]);
      expect(view.viewData.traps).toEqual([{ row: 2, col: 2 }]);

      // Only old ping should be visible (new one is too recent)
      const pings = view.viewData.pings as { row: number; col: number }[];
      expect(pings.length).toBe(1);
      expect(pings[0].row).toBe(1);
    });

    test("Cartographer should NOT see runner positions", () => {
      const state = createFullState();
      const view = labyrinthNavigateHandler.getPlayerView(state, "p1", "Χαρτογράφος", mockConfig);

      expect(view.viewData.runnerPositions).toBeUndefined();
      expect(view.viewData.position).toBeUndefined();
    });

    test("Runner should see local grid only", () => {
      const state = createFullState();
      const view = labyrinthNavigateHandler.getPlayerView(state, "p2", "Δρομέας", mockConfig);

      expect(view.role).toBe("Δρομέας");
      expect(view.viewData.position).toEqual({ row: 2, col: 2 });
      expect(view.viewData.visibilityRadius).toBe(1);

      // Local grid should be 3x3 (radius 1 around center)
      const localGrid = view.viewData.localGrid as number[][];
      expect(localGrid.length).toBe(3);
      expect(localGrid[0].length).toBe(3);
    });

    test("Runner should NOT see full grid or exit position", () => {
      const state = createFullState();
      const view = labyrinthNavigateHandler.getPlayerView(state, "p2", "Δρομέας", mockConfig);

      expect(view.viewData.grid).toBeUndefined();
      expect(view.viewData.exitPosition).toBeUndefined();
      expect(view.viewData.traps).toBeUndefined();
    });

    test("Runner at corner should get fog for out-of-bounds cells", () => {
      const state = createFullState();
      (state.data as any).runnerPositions = { p2: { row: 0, col: 0 } };

      const view = labyrinthNavigateHandler.getPlayerView(state, "p2", "Δρομέας", mockConfig);
      const localGrid = view.viewData.localGrid as number[][];

      // Top-left corner: cells above and left should be fog (-1)
      expect(localGrid[0][0]).toBe(-1); // (-1,-1) = fog
      expect(localGrid[0][1]).toBe(-1); // (-1,0) = fog
      expect(localGrid[1][0]).toBe(-1); // (0,-1) = fog
      expect(localGrid[1][1]).toBe(0);  // (0,0) = floor (start position)
    });

    test("Runner should see nearby landmarks", () => {
      const state = createFullState();
      (state.data as any).runnerPositions = { p2: { row: 2, col: 4 } };

      const view = labyrinthNavigateHandler.getPlayerView(state, "p2", "Δρομέας", mockConfig);
      const landmarks = view.viewData.nearbyLandmarks as { row: number; col: number; label: string }[];
      expect(landmarks.length).toBe(1);
      expect(landmarks[0].label).toBe("Στήλη");
    });
  });
});
