// ============================================================
// Puzzle: Labyrinth Navigate — The Labyrinth of Daedalus
// ============================================================
// Cartographer sees the full maze; Runners see only nearby tiles.

import type { PuzzleHandler } from "./puzzle-handler.ts";
import type { Player, PuzzleConfig, PuzzleState, PlayerView } from "../../../shared/types.ts";

// Cell types in the grid
const FLOOR = 0;
const WALL = 1;
const TRAP = 2;
const EXIT = 3;
const LANDMARK = 4;

interface LabyrinthData {
  grid: number[][];
  rows: number;
  cols: number;
  runnerPositions: Record<string, { row: number; col: number }>;
  exitPosition: { row: number; col: number };
  landmarks: { row: number; col: number; label: string }[];
  traps: { row: number; col: number }[];
  pingHistory: { row: number; col: number; timestamp: number }[];
  pingDelayMs: number;
  visibilityRadius: number;
  reachedExit: boolean;
}

export const labyrinthNavigateHandler: PuzzleHandler = {
  init(players: Player[], config: PuzzleConfig): PuzzleState {
    const data = config.data as {
      rows: number;
      cols: number;
      grid: number[][];
      start_position: number[];
      exit_position: number[];
      landmarks: { row: number; col: number; label: string }[];
      traps: number[][];
      ping_delay_ms: number;
      visibility_radius: number;
    };

    const startRow = data.start_position[0] ?? 0;
    const startCol = data.start_position[1] ?? 0;

    // All runners start at the same position
    const runnerPositions: Record<string, { row: number; col: number }> = {};
    for (const player of players) {
      if ((player.role ?? "").includes("Δρομέας") || (player.role ?? "").toLowerCase().includes("runner")) {
        runnerPositions[player.id] = { row: startRow, col: startCol };
      }
    }
    // If no runners found yet (roles not assigned at init time), assign all non-first players
    if (Object.keys(runnerPositions).length === 0) {
      for (const player of players) {
        runnerPositions[player.id] = { row: startRow, col: startCol };
      }
    }

    const exitPosition = {
      row: data.exit_position[0] ?? data.rows - 1,
      col: data.exit_position[1] ?? data.cols - 1,
    };

    const traps = (data.traps ?? []).map((t) => ({
      row: t[0] ?? 0,
      col: t[1] ?? 0,
    }));

    const puzzleData: LabyrinthData = {
      grid: data.grid,
      rows: data.rows,
      cols: data.cols,
      runnerPositions,
      exitPosition,
      landmarks: data.landmarks ?? [],
      traps,
      pingHistory: [],
      pingDelayMs: data.ping_delay_ms ?? 2000,
      visibilityRadius: data.visibility_radius ?? 1,
      reachedExit: false,
    };

    return {
      puzzleId: config.id,
      type: "labyrinth_navigate" as any,
      status: "active" as any,
      data: puzzleData as unknown as Record<string, unknown>,
    };
  },

  handleAction(
    state: PuzzleState,
    playerId: string,
    action: string,
    data: Record<string, unknown>
  ): { state: PuzzleState; glitchDelta: number } {
    const puzzleData = state.data as unknown as LabyrinthData;
    let glitchDelta = 0;

    if (action === "move") {
      const direction = data.direction as string;
      const pos = puzzleData.runnerPositions[playerId];
      if (!pos) return { state, glitchDelta: 0 };

      let newRow = pos.row;
      let newCol = pos.col;

      switch (direction) {
        case "up": newRow -= 1; break;
        case "down": newRow += 1; break;
        case "left": newCol -= 1; break;
        case "right": newCol += 1; break;
        default: return { state, glitchDelta: 0 };
      }

      // Bounds check
      if (newRow < 0 || newRow >= puzzleData.rows || newCol < 0 || newCol >= puzzleData.cols) {
        return { state, glitchDelta: 0 }; // Out of bounds — no-op
      }

      // Wall check
      const cellValue = puzzleData.grid[newRow]?.[newCol];
      if (cellValue === WALL) {
        return { state, glitchDelta: 0 }; // Wall — no-op
      }

      // Move the runner
      puzzleData.runnerPositions[playerId] = { row: newRow, col: newCol };

      // Trap check
      if (cellValue === TRAP) {
        glitchDelta = 6; // Will be overridden by config.glitch_penalty in engine
      }

      // Exit check
      if (cellValue === EXIT ||
          (newRow === puzzleData.exitPosition.row && newCol === puzzleData.exitPosition.col)) {
        puzzleData.reachedExit = true;
      }
    } else if (action === "ping") {
      const pos = puzzleData.runnerPositions[playerId];
      if (pos) {
        puzzleData.pingHistory.push({
          row: pos.row,
          col: pos.col,
          timestamp: Date.now(),
        });
        // Keep only last 20 pings to prevent unbounded growth
        if (puzzleData.pingHistory.length > 20) {
          puzzleData.pingHistory = puzzleData.pingHistory.slice(-20);
        }
      }
    }

    return {
      state: { ...state, data: puzzleData as unknown as Record<string, unknown> },
      glitchDelta,
    };
  },

  checkWin(state: PuzzleState): boolean {
    const data = state.data as unknown as LabyrinthData;
    return data.reachedExit;
  },

  getPlayerView(
    state: PuzzleState,
    playerId: string,
    playerRole: string,
    config: PuzzleConfig
  ): PlayerView {
    const data = state.data as unknown as LabyrinthData;
    const now = Date.now();

    const baseView = {
      playerId,
      role: playerRole,
      puzzleId: state.puzzleId,
      puzzleType: state.type,
      puzzleTitle: config.title,
    };

    if (playerRole === "Χαρτογράφος") {
      // Cartographer sees full map, delayed pings, no direct runner position
      const visiblePings = data.pingHistory.filter(
        (p) => now - p.timestamp >= data.pingDelayMs
      );

      return {
        ...baseView,
        viewData: {
          grid: data.grid,
          rows: data.rows,
          cols: data.cols,
          landmarks: data.landmarks,
          traps: data.traps,
          exitPosition: data.exitPosition,
          pings: visiblePings.map((p) => ({ row: p.row, col: p.col })),
        },
      };
    } else {
      // Runner sees local grid only
      const pos = data.runnerPositions[playerId] ?? { row: 0, col: 0 };
      const r = data.visibilityRadius;

      // Extract local sub-grid
      const localGrid: (number | -1)[][] = [];
      for (let row = pos.row - r; row <= pos.row + r; row++) {
        const gridRow: (number | -1)[] = [];
        for (let col = pos.col - r; col <= pos.col + r; col++) {
          if (row < 0 || row >= data.rows || col < 0 || col >= data.cols) {
            gridRow.push(-1); // Out of bounds = fog
          } else {
            gridRow.push(data.grid[row]?.[col] ?? -1);
          }
        }
        localGrid.push(gridRow);
      }

      // Find nearby landmarks within visibility
      const nearbyLandmarks = data.landmarks.filter(
        (lm) => Math.abs(lm.row - pos.row) <= r && Math.abs(lm.col - pos.col) <= r
      );

      return {
        ...baseView,
        viewData: {
          localGrid,
          position: pos,
          visibilityRadius: r,
          nearbyLandmarks,
          rows: data.rows,
          cols: data.cols,
        },
      };
    }
  },
};
