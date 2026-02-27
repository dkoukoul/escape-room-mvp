// ============================================================
// Puzzle: Rhythm Tap — The Oracle's Frequency
// ============================================================
// All players must tap colors in sync to a sequence.

import type { PuzzleHandler } from "./puzzle-handler.ts";
import type { Player, PuzzleConfig, PuzzleState, PlayerView } from "../../../shared/types.ts";

interface RhythmData {
  sequences: string[][];         // All sequences to complete
  currentRound: number;
  roundsToWin: number;
  playerTaps: string[];  // playerId -> taps for current round
  hopliteId: string;
  hopliteSuccesses: number;
  currentSequence: string[];
}

export const rhythmTapHandler: PuzzleHandler = {
  init(players: Player[], config: PuzzleConfig): PuzzleState {
    const data = config.data as {
      sequences: string[][];
      rounds_to_win?: number;
      rounds_to_play?: number;
    };

    let allSequences = [...data.sequences];
    // Shuffle sequences
    for (let i = allSequences.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = allSequences[i]!;
      allSequences[i] = allSequences[j]!;
      allSequences[j] = temp;
    }

    const roundsToPlay = data.rounds_to_play || allSequences.length;
    const selectedSequences = allSequences.slice(0, roundsToPlay);
    const roundsToWin = data.rounds_to_win || selectedSequences.length;
    const hoplite = players.find(p => p.role === "hoplite");
    const puzzleData: RhythmData = {
      sequences: selectedSequences,
      currentRound: 0,
      roundsToWin: roundsToWin,
      playerTaps: [],
      hopliteId: hoplite?.id ?? "",
      hopliteSuccesses: 0,
      currentSequence: selectedSequences[0] ?? []
    };

    return {
      puzzleId: config.id,
      type: "rhythm_tap",
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
    const puzzleData = state.data as unknown as RhythmData;
    let glitchDelta = 0;

    if (action === "submit_sequence") {
      const taps = data.taps as string[];
      const seq = puzzleData.currentSequence;

      let correct = true;

      if (taps.length !== seq.length) {
        correct = false;
      } else {
        for (let i = 0; i < seq.length; i++) {
          if (taps[i] !== seq[i]) {
            correct = false;
            break;
          }
        }
      }
      if (correct) {
        puzzleData.hopliteSuccesses++;

        // Advance round
        puzzleData.currentRound++;

        if (puzzleData.currentRound < puzzleData.sequences.length) {
          puzzleData.currentSequence =
            puzzleData.sequences[puzzleData.currentRound] ?? [];
        }

      } else {
        glitchDelta = 3; // penalty only once
      }
    }

    return { state: { ...state, data: puzzleData as unknown as Record<string, unknown> }, glitchDelta };
  },

  checkWin(state: PuzzleState): boolean {
    const data = state.data as unknown as RhythmData;
    return data.hopliteSuccesses >= data.roundsToWin;
  },

  getPlayerView(
    state: PuzzleState,
    playerId: string,
    playerRole: string,
    config: PuzzleConfig
  ): PlayerView {
    const data = state.data as unknown as RhythmData;
    const configData = config.data as Record<string, unknown>;

    return {
      playerId,
      role: playerRole,
      puzzleId: state.puzzleId,
      puzzleType: state.type,
      puzzleTitle: config.title,
      viewData: {
        currentSequence: data.currentSequence,
        currentRound: data.currentRound,
        roundsToWin: data.roundsToWin,
        hopliteId: data.hopliteId,
        hopliteSuccesses: data.hopliteSuccesses,
        toleranceMs: configData.tolerance_ms ?? 600,
        playbackSpeedMs: configData.playback_speed_ms ?? 800,
      },
    };
  },
};
