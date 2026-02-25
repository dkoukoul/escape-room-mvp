// ============================================================
// Puzzle: Collaborative Wiring — The Columns of Logic
// ============================================================
// Each player controls switches; correct combo lights all columns.

import type { PuzzleHandler } from "./puzzle-handler.ts";
import type { Player, PuzzleConfig, PuzzleState, PlayerView } from "../../../shared/types.ts";

interface WiringData {
  gridSize: number;                        // Number of columns
  switchStates: boolean[];                 // Current state of all switches
  allSolutionMatrices: boolean[][][];      // Pool of matrices
  solutionMatrix: boolean[][];             // Active matrix
  switchAssignments: Record<string, number[]>; // playerId -> switch indices
  columnsLit: boolean[];                   // Current column states
  attempts: number;
  maxAttempts: number;
  currentRound: number;
  roundsToPlay: number;
  boardsSolved: number;
}

export const collaborativeWiringHandler: PuzzleHandler = {
  init(players: Player[], config: PuzzleConfig): PuzzleState {
    const data = config.data as {
      grid_size: number;
      switches_per_player: number;
      solution_matrix?: boolean[][];
      solution_matrices?: boolean[][][];
      rounds_to_play?: number;
      max_attempts: number;
    };

    let matrices: boolean[][][] = data.solution_matrices || (data.solution_matrix ? [data.solution_matrix] : []);
    
    // Shuffle matrices
    for (let i = matrices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = matrices[i]!;
      matrices[i] = matrices[j]!;
      matrices[j] = temp;
    }

    const roundsToPlay = data.rounds_to_play || 1;
    const selectedMatrices = matrices.slice(0, roundsToPlay);
    const initialMatrix = selectedMatrices[0] || [];

    const totalSwitches = initialMatrix.length;
    const switchStates = new Array(totalSwitches).fill(false);

    // Distribute switches among players
    const switchAssignments: Record<string, number[]> = {};
    let switchIndex = 0;
    for (const player of players) {
      const assigned: number[] = [];
      for (let i = 0; i < data.switches_per_player && switchIndex < totalSwitches; i++) {
        assigned.push(switchIndex);
        switchIndex++;
      }
      switchAssignments[player.id] = assigned;
    }

    // Any remaining switches distributed round-robin
    while (switchIndex < totalSwitches) {
      const player = players[switchIndex % players.length]!;
      const assigned = switchAssignments[player.id] || [];
      assigned.push(switchIndex);
      switchAssignments[player.id] = assigned;
      switchIndex++;
    }

    const puzzleData: WiringData = {
      gridSize: data.grid_size,
      switchStates,
      allSolutionMatrices: selectedMatrices,
      solutionMatrix: initialMatrix,
      switchAssignments,
      columnsLit: computeColumns(switchStates, initialMatrix, data.grid_size),
      attempts: 0,
      maxAttempts: data.max_attempts,
      currentRound: 0,
      roundsToPlay: roundsToPlay,
      boardsSolved: 0,
    };

    return {
      puzzleId: config.id,
      type: "collaborative_wiring",
      status: "active",
      data: puzzleData as unknown as Record<string, unknown>,
    };
  },

  handleAction(
    state: PuzzleState,
    playerId: string,
    action: string,
    data: Record<string, unknown>
  ): { state: PuzzleState; glitchDelta: number } {
    const puzzleData = state.data as unknown as WiringData;
    let glitchDelta = 0;

    if (action === "toggle_switch") {
      const switchIdx = data.switchIndex as number;
      const playerSwitches = puzzleData.switchAssignments[playerId] ?? [];

      // Only allow toggling your own switches
      if (!playerSwitches.includes(switchIdx)) {
        return { state, glitchDelta: 0 };
      }

      puzzleData.switchStates[switchIdx] = !puzzleData.switchStates[switchIdx];
      puzzleData.columnsLit = computeColumns(
        puzzleData.switchStates,
        puzzleData.solutionMatrix,
        puzzleData.gridSize
      );
    } else if (action === "check_solution") {
      puzzleData.attempts++;
      const allLit = puzzleData.columnsLit.every(Boolean);
      if (allLit) {
        puzzleData.boardsSolved++;
        if (puzzleData.boardsSolved < puzzleData.roundsToPlay) {
          // Move to next board
          puzzleData.currentRound++;
          puzzleData.solutionMatrix = puzzleData.allSolutionMatrices[puzzleData.currentRound] || [];
          puzzleData.switchStates = new Array(puzzleData.solutionMatrix.length).fill(false);
          puzzleData.columnsLit = computeColumns(
            puzzleData.switchStates,
            puzzleData.solutionMatrix,
            puzzleData.gridSize
          );
        }
      } else {
        glitchDelta = 4;
      }
    }

    return { state: { ...state, data: puzzleData as unknown as Record<string, unknown> }, glitchDelta };
  },

  checkWin(state: PuzzleState): boolean {
    const data = state.data as unknown as WiringData;
    return data.boardsSolved >= data.roundsToPlay;
  },

  getPlayerView(
    state: PuzzleState,
    playerId: string,
    playerRole: string,
    config: PuzzleConfig
  ): PlayerView {
    const data = state.data as unknown as WiringData;

    return {
      playerId,
      role: playerRole,
      puzzleId: state.puzzleId,
      puzzleType: state.type,
      puzzleTitle: config.title,
      viewData: {
        gridSize: data.gridSize,
        columnsLit: data.columnsLit,
        mySwitches: data.switchAssignments[playerId] ?? [],
        switchStates: data.switchStates,
        attempts: data.attempts,
        maxAttempts: data.maxAttempts,
        currentRound: data.currentRound,
        roundsToPlay: data.roundsToPlay,
        boardsSolved: data.boardsSolved,
      },
    };
  },
};

/**
 * Compute which columns are lit based on active switches
 */
function computeColumns(
  switchStates: boolean[],
  matrix: boolean[][],
  gridSize: number
): boolean[] {
  const columns = new Array(gridSize).fill(false);

  // A column is lit if at least one active switch powers it
  // Actually: a column is lit if the XOR of all active switches that affect it = true
  // Simpler for MVP: column is lit if the correct combination of switches is on
  for (let col = 0; col < gridSize; col++) {
    let powered = false;
    for (let sw = 0; sw < switchStates.length; sw++) {
      if (switchStates[sw] && matrix[sw]?.[col]) {
        powered = !powered; // XOR logic — toggle
      }
    }
    columns[col] = powered;
  }

  return columns;
}

// export compute columns for testing
export { computeColumns };