// ============================================================
// Puzzle: Cipher Decode — The Philosopher's Cipher
// ============================================================
// Cryptographer sees the key; Scribes decode encrypted sentences.

import type { PuzzleHandler } from "./puzzle-handler.ts";
import type { Player, PuzzleConfig, PuzzleState, PlayerView } from "../../../shared/types.ts";

interface CipherData {
  cipherKey: Record<string, string>;       // Α→Ω mapping
  sentences: { encrypted: string; decoded: string; hint: string }[];
  currentSentenceIndex: number;
  completedSentences: number;
  wrongSubmissions: number;
  attempts: Record<string, string[]>;      // playerId -> their attempts
}

export const cipherDecodeHandler: PuzzleHandler = {
  init(players: Player[], config: PuzzleConfig): PuzzleState {
    const data = config.data as {
      cipher_key: Record<string, string>;
      sentences: { encrypted: string; decoded: string; hint: string }[];
    };

    const puzzleData: CipherData = {
      cipherKey: data.cipher_key,
      sentences: data.sentences,
      currentSentenceIndex: 0,
      completedSentences: 0,
      wrongSubmissions: 0,
      attempts: {},
    };

    return {
      puzzleId: config.id,
      type: "cipher_decode",
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
    const puzzleData = state.data as unknown as CipherData;
    let glitchDelta = 0;

    if (action === "submit_decode") {
      const submission = (data.text as string).toUpperCase().trim();
      const currentSentence = puzzleData.sentences[puzzleData.currentSentenceIndex];

      if (!currentSentence) return { state, glitchDelta: 0 };

      // Track attempts
      if (!puzzleData.attempts[playerId]) {
        puzzleData.attempts[playerId] = [];
      }
      puzzleData.attempts[playerId]!.push(submission);

      if (submission === currentSentence.decoded) {
        // Correct!
        puzzleData.completedSentences++;
        puzzleData.currentSentenceIndex++;
        puzzleData.attempts = {}; // Reset attempts for next sentence
      } else {
        // Wrong
        puzzleData.wrongSubmissions++;
        glitchDelta = 5;
      }
    }

    return { state: { ...state, data: puzzleData as unknown as Record<string, unknown> }, glitchDelta };
  },

  checkWin(state: PuzzleState): boolean {
    const data = state.data as unknown as CipherData;
    return data.completedSentences >= data.sentences.length;
  },

  getPlayerView(
    state: PuzzleState,
    playerId: string,
    playerRole: string,
    config: PuzzleConfig
  ): PlayerView {
    const data = state.data as unknown as CipherData;
    const currentSentence = data.sentences[data.currentSentenceIndex];

    const baseView = {
      playerId,
      role: playerRole,
      puzzleId: state.puzzleId,
      puzzleType: state.type,
      puzzleTitle: config.title,
    };

    if (playerRole === "Cryptographer") {
      // Cryptographer sees the cipher key
      return {
        ...baseView,
        viewData: {
          cipherKey: data.cipherKey,
          currentEncrypted: currentSentence?.encrypted ?? "",
          hint: currentSentence?.hint ?? "",
          completedSentences: data.completedSentences,
          totalSentences: data.sentences.length,
          currentSentenceIndex: data.currentSentenceIndex,
        },
      };
    } else {
      // Scribes see encrypted text and must decode it
      return {
        ...baseView,
        viewData: {
          currentEncrypted: currentSentence?.encrypted ?? "",
          hint: currentSentence?.hint ?? "",
          completedSentences: data.completedSentences,
          totalSentences: data.sentences.length,
          currentSentenceIndex: data.currentSentenceIndex,
          myAttempts: data.attempts[playerId] ?? [],
        },
      };
    }
  },
};
