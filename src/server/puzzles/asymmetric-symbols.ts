// ============================================================
// Puzzle: Asymmetric Symbols
// ============================================================
// Navigator sees target words; Decoders capture flying letters.

import type { PuzzleHandler } from "./puzzle-handler.ts";
import type { Player, PuzzleConfig, PuzzleState, PlayerView } from "../../../shared/types.ts";

interface SymbolsData {
  solutionWords: string[];
  currentWordIndex: number;
  capturedLetters: string[];          // Letters captured so far for current word
  capturedBy: Record<string, string>; // letterId -> playerId
  wrongCaptures: number;
  completedWords: string[];
}

export const asymmetricSymbolsHandler: PuzzleHandler = {
  init(players: Player[], config: PuzzleConfig): PuzzleState {
    const data = config.data as {
      solution_words: string[];
      rounds_to_play?: number;
    };

    let words = [...data.solution_words];
    // Shuffle words
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = words[i]!;
      words[i] = words[j]!;
      words[j] = temp;
    }

    const roundsToPlay = data.rounds_to_play || words.length;
    const selectedWords = words.slice(0, roundsToPlay);

    const puzzleData: SymbolsData = {
      solutionWords: selectedWords,
      currentWordIndex: 0,
      capturedLetters: selectedWords.length > 0 ? (selectedWords[0] || "").split("").map(() => "_") : [],
      capturedBy: {},
      wrongCaptures: 0,
      completedWords: [],
    };

    return {
      puzzleId: config.id,
      type: "asymmetric_symbols" as any,
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
    const puzzleData = state.data as unknown as SymbolsData;
    let glitchDelta = 0;

    if (action === "capture_letter") {
      const letter = data.letter as string;
      const currentWord = puzzleData.solutionWords[puzzleData.currentWordIndex];
      if (!currentWord) {
        console.log(`[AsymmetricSymbols] No current word, returning early`);
        return { state, glitchDelta: 0 };
      }

      console.log(`[AsymmetricSymbols] Capture attempt: letter="${letter}", currentWord="${currentWord}", capturedLetters="${puzzleData.capturedLetters.join("")}"`);

      let insertIndex = -1;
      for (let i = 0; i < currentWord.length; i++) {
        if (currentWord[i] === letter && puzzleData.capturedLetters[i] === "_") {
           insertIndex = i;
           break;
        }
      }

      if (insertIndex !== -1) {
        // Correct capture
        console.log(`[AsymmetricSymbols] Correct capture at index ${insertIndex}`);
        puzzleData.capturedLetters[insertIndex] = letter;
        puzzleData.capturedBy[`${puzzleData.currentWordIndex}-${insertIndex}`] = playerId;

        // Check if word is complete
        if (puzzleData.capturedLetters.every(c => c !== "_")) {
          puzzleData.completedWords.push(currentWord);
          puzzleData.currentWordIndex++;
          const nextWord = puzzleData.solutionWords[puzzleData.currentWordIndex];
          puzzleData.capturedLetters = nextWord ? Array(nextWord.length).fill("_") : [];
        }
      } else {
        // Wrong letter
        console.log(`[AsymmetricSymbols] Wrong letter "${letter}" - adding glitch penalty`);
        puzzleData.wrongCaptures++;
        glitchDelta = 5; // From config.glitch_penalty
      }
    }

    console.log(`[AsymmetricSymbols] Returning glitchDelta: ${glitchDelta}`);
    return { state: { ...state, data: puzzleData as unknown as Record<string, unknown> }, glitchDelta };
  },

  checkWin(state: PuzzleState): boolean {
    const data = state.data as unknown as SymbolsData;
    return data.completedWords.length === data.solutionWords.length;
  },

  getPlayerView(
    state: PuzzleState,
    playerId: string,
    playerRole: string,
    config: PuzzleConfig
  ): PlayerView {
    const data = state.data as unknown as SymbolsData;
    const configData = config.data as Record<string, unknown>;

    // Validate decoy ratio (must be between 0 and 0.9)
    let decoyRatio = configData.decoy_ratio as number ?? 0.3;
    decoyRatio = Math.max(0, Math.min(0.9, decoyRatio));

    const baseView = {
      playerId,
      role: playerRole,
      puzzleId: state.puzzleId,
      puzzleType: state.type,
      puzzleTitle: config.title,
    };

    if (playerRole === "Navigator") {
      // Navigator sees all solution words and progress
      return {
        ...baseView,
        viewData: {
          solutionWords: data.solutionWords,
          currentWordIndex: data.currentWordIndex,
          capturedLetters: data.capturedLetters,
          completedWords: data.completedWords,
          totalWords: data.solutionWords.length,
          spawnIntervalMs: configData.spawn_interval_ms ?? 800,
          letterLifetimeMs: configData.letter_lifetime_ms ?? 4000,
          decoyRatio,
          glitchSpeed: configData.glitch_speed ?? "medium",
        },
      };
    } else {
      // Decoder sees flying letters and capture state
      const currentWord = data.solutionWords[data.currentWordIndex] ?? "";
      return {
        ...baseView,
        viewData: {
          solutionWords: data.solutionWords, // Add this for synchronization
          currentWordIndex: data.currentWordIndex, // Add this for synchronization
          currentWordLength: currentWord.length,
          capturedLetters: data.capturedLetters,
          capturedCount: data.capturedLetters.filter(c => c !== "_").length,
          completedWords: data.completedWords.length,
          totalWords: data.solutionWords.length,
          spawnIntervalMs: configData.spawn_interval_ms ?? 800,
          letterLifetimeMs: configData.letter_lifetime_ms ?? 4000,
          decoyRatio,
          glitchSpeed: configData.glitch_speed ?? "medium",
        },
      };
    }
  },
};
