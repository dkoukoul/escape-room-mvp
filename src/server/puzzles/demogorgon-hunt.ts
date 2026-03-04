import type { PuzzleHandler } from "./puzzle-handler.ts";
import type { Player, PuzzleConfig, PuzzleState, PlayerView } from "../../../shared/types.ts";
import { PuzzleType, PuzzleStatus } from "../../../shared/types.ts";

interface Position {
  row: number;
  col: number;
}

interface DemogorgonHuntData {
  gridSize: number;
  quadrantSize: number;
  demogorgonMovesPerRound: number;
  trapsPerRound: number;
  maxRounds: number;
  demogorgonPath: Position[];
  schoolPosition: Position;

  currentRound: number;
  demogorgonPositionIndex: number; // Current index in the path
  placedTraps: Position[]; // All traps placed in previous rounds
  currentRoundTraps: Position[]; // Traps placed in the current round
  
  statusOverride: "win" | "lose" | null;
}

export const demogorgonHuntHandler: PuzzleHandler = {
  init(players: Player[], config: PuzzleConfig): PuzzleState {
    const data = config.data as {
      grid_size: number;
      quadrant_size: number;
      demogorgon_moves_per_round: number;
      traps_per_round: number;
      max_rounds: number;
      demogorgon_paths: [number, number][][];
      school_position: [number, number];
    };

    // Pick a random path
    const paths = data.demogorgon_paths || [];
    const defaultPath: [number, number][] = [[0,0], [1,1], [2,2], [3,3], [4,4], [5,5], [6,6], [7,7]];
    const chosenRawPath: [number, number][] = paths.length > 0 
      ? paths[Math.floor(Math.random() * paths.length)]! 
      : defaultPath;

    const demogorgonPath: Position[] = chosenRawPath.map(p => ({ row: p[0], col: p[1] }));

    const puzzleData: DemogorgonHuntData = {
      gridSize: data.grid_size,
      quadrantSize: data.quadrant_size,
      demogorgonMovesPerRound: data.demogorgon_moves_per_round,
      trapsPerRound: data.traps_per_round,
      maxRounds: data.max_rounds,
      demogorgonPath,
      schoolPosition: { row: data.school_position[0], col: data.school_position[1] },

      currentRound: 1,
      demogorgonPositionIndex: 0,
      placedTraps: [],
      currentRoundTraps: [],
      
      statusOverride: null,
    };

    return {
      puzzleId: config.id,
      type: PuzzleType.DEMOGORGON_HUNT,
      status: PuzzleStatus.ACTIVE,
      data: puzzleData as unknown as Record<string, unknown>,
    };
  },

  handleAction(
    state: PuzzleState,
    playerId: string,
    action: string,
    actionData: Record<string, unknown>
  ): { state: PuzzleState; glitchDelta: number } {
    const puzzleData = state.data as unknown as DemogorgonHuntData;
    let glitchDelta = 0;

    if (puzzleData.statusOverride) return { state, glitchDelta }; // Game over

    if (action === "toggle_trap") {
      const row = actionData.row as number;
      const col = actionData.col as number;

      // Check if it's an existing permanent trap
      if (puzzleData.placedTraps.some(t => t.row === row && t.col === col)) {
        return { state, glitchDelta: 0 };
      }

      const existingIndex = puzzleData.currentRoundTraps.findIndex(t => t.row === row && t.col === col);
      if (existingIndex !== -1) {
        // Remove it
        puzzleData.currentRoundTraps.splice(existingIndex, 1);
      } else {
        // Add it if under limit
        if (puzzleData.currentRoundTraps.length < puzzleData.trapsPerRound) {
          puzzleData.currentRoundTraps.push({ row, col });
        }
      }
    } else if (action === "confirm_round") {
      // Must have placed all allowed traps (or as many as they want, let's enforce exact amount)
      if (puzzleData.currentRoundTraps.length !== puzzleData.trapsPerRound) {
        // Optional: flash an error to player, but here we just ignore
        return { state, glitchDelta: 0 };
      }

      // 1. Commit traps
      puzzleData.placedTraps.push(...puzzleData.currentRoundTraps);
      puzzleData.currentRoundTraps = [];

      // 2. Move Demogorgon
      const oldIndex = puzzleData.demogorgonPositionIndex;
      const newIndex = Math.min(
        oldIndex + puzzleData.demogorgonMovesPerRound,
        puzzleData.demogorgonPath.length - 1
      );
      
      puzzleData.demogorgonPositionIndex = newIndex;
      
      // 3. Check for trap collision along the path taken
      let caught = false;
      for (let i = oldIndex + 1; i <= newIndex; i++) {
        const p = puzzleData.demogorgonPath[i];
        if (p && puzzleData.placedTraps.some(t => t.row === p.row && t.col === p.col)) {
          caught = true;
          break;
        }
      }

      if (caught) {
        puzzleData.statusOverride = "win";
      } else if (newIndex >= puzzleData.demogorgonPath.length - 1) {
        // Reached the school
        puzzleData.statusOverride = "lose";
        glitchDelta = 10;
      } else {
        // Next round
        puzzleData.currentRound++;
        if (puzzleData.currentRound > puzzleData.maxRounds) {
          puzzleData.statusOverride = "lose";
          glitchDelta = 10;
        }
      }
    }

    return { state: { ...state, data: puzzleData as unknown as Record<string, unknown> }, glitchDelta };
  },

  checkWin(state: PuzzleState): boolean {
    const data = state.data as unknown as DemogorgonHuntData;
    return data.statusOverride === "win";
  },

  getPlayerView(
    state: PuzzleState,
    playerId: string,
    playerRole: string,
    config: PuzzleConfig
  ): PlayerView {
    const data = state.data as unknown as DemogorgonHuntData;

    const baseView = {
      playerId,
      role: playerRole,
      puzzleId: state.puzzleId,
      puzzleType: state.type,
      puzzleTitle: config.title,
    };

    if (playerRole === "Eleven") {
      // Compute quadrant
      const pos = data.demogorgonPath[data.demogorgonPositionIndex]!;
      const isNorth = pos.row < data.quadrantSize;
      const isWest = pos.col < data.quadrantSize;
      let quadrant = "";
      if (isNorth && isWest) quadrant = "NW";
      if (isNorth && !isWest) quadrant = "NE";
      if (!isNorth && isWest) quadrant = "SW";
      if (!isNorth && !isWest) quadrant = "SE";

      return {
        ...baseView,
        viewData: {
          currentRound: data.currentRound,
          maxRounds: data.maxRounds,
          quadrant,
          statusOverride: data.statusOverride,
        },
      };
    } else {
      // Trapper sees the board but NOT the Demogorgon
      return {
        ...baseView,
        viewData: {
          currentRound: data.currentRound,
          maxRounds: data.maxRounds,
          gridSize: data.gridSize,
          placedTraps: data.placedTraps,
          currentRoundTraps: data.currentRoundTraps,
          trapsPerRound: data.trapsPerRound,
          schoolPosition: data.schoolPosition,
          statusOverride: data.statusOverride,
        },
      };
    }
  },
};
