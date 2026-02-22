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
  playerTaps: Record<string, string[]>;  // playerId -> taps for current round
  playerReady: Record<string, boolean>;  // Who has submitted their taps
  totalPlayers: number;
  roundResults: boolean[];       // true/false per completed round
  currentSequence: string[];
  showingSequence: boolean;
}

export const rhythmTapHandler: PuzzleHandler = {
  init(players: Player[], config: PuzzleConfig): PuzzleState {
    const data = config.data as {
      sequences: string[][];
      rounds_to_win: number;
    };

    const puzzleData: RhythmData = {
      sequences: data.sequences,
      currentRound: 0,
      roundsToWin: data.rounds_to_win,
      playerTaps: {},
      playerReady: {},
      totalPlayers: players.length,
      roundResults: [],
      currentSequence: data.sequences[0] ?? [],
      showingSequence: true,
    };

    // Initialize all players as not ready
    for (const p of players) {
      puzzleData.playerTaps[p.id] = [];
      puzzleData.playerReady[p.id] = false;
    }

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
      puzzleData.playerTaps[playerId] = taps;
      puzzleData.playerReady[playerId] = true;

      // Check if all players have submitted
      const allReady = Object.values(puzzleData.playerReady).every(Boolean);
      if (allReady) {
        // Check if all players' taps match the sequence
        const seq = puzzleData.currentSequence;
        let allCorrect = true;

        for (const [pid, playerTaps] of Object.entries(puzzleData.playerTaps)) {
          if (playerTaps.length !== seq.length) {
            allCorrect = false;
            continue;
          }
          for (let i = 0; i < seq.length; i++) {
            if (playerTaps[i] !== seq[i]) {
              allCorrect = false;
              break;
            }
          }
        }

        puzzleData.roundResults.push(allCorrect);

        if (!allCorrect) {
          glitchDelta = 3 * puzzleData.totalPlayers;
        }

        // Move to next round
        puzzleData.currentRound++;
        if (puzzleData.currentRound < puzzleData.sequences.length) {
          puzzleData.currentSequence = puzzleData.sequences[puzzleData.currentRound] ?? [];
          puzzleData.showingSequence = true;
          // Reset player readiness
          for (const pid of Object.keys(puzzleData.playerReady)) {
            puzzleData.playerReady[pid] = false;
            puzzleData.playerTaps[pid] = [];
          }
        }
      }
    } else if (action === "sequence_watched") {
      // Player acknowledges they've seen the sequence
      puzzleData.showingSequence = false;
    }

    return { state: { ...state, data: puzzleData as unknown as Record<string, unknown> }, glitchDelta };
  },

  checkWin(state: PuzzleState): boolean {
    const data = state.data as unknown as RhythmData;
    const successRounds = data.roundResults.filter(Boolean).length;
    return successRounds >= data.roundsToWin;
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
        showingSequence: data.showingSequence,
        isReady: data.playerReady[playerId] ?? false,
        playersReady: Object.values(data.playerReady).filter(Boolean).length,
        totalPlayers: data.totalPlayers,
        roundResults: data.roundResults,
        toleranceMs: configData.tolerance_ms ?? 600,
        playbackSpeedMs: configData.playback_speed_ms ?? 800,
      },
    };
  },
};
