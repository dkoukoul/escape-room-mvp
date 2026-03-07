// ============================================================
// Puzzle: Echo Relay — The Echo Chamber of Hermes
// ============================================================
// Scribe sees garbled text; Tuners adjust frequency dials to decode it.

import type { PuzzleHandler } from "./puzzle-handler.ts";
import type { Player, PuzzleConfig, PuzzleState, PlayerView } from "../../../shared/types.ts";

interface EchoDial {
  id: string;
  label: string;
  currentValue: number;
  correctValue: number;
  minValue: number;
  maxValue: number;
  step: number;
  affectedPositions: number[];
}

interface EchoRelayData {
  originalText: string;
  charStates: ("decoded" | "garbled")[];
  dials: EchoDial[];
  garbleMap: Record<number, string>; // character index -> garbled replacement
  wrongSubmissions: number;
  isFullyDecoded: boolean;
}

const GREEK_LETTERS = "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ";

function randomGreekLetter(exclude: string): string {
  let letter: string;
  do {
    letter = GREEK_LETTERS[Math.floor(Math.random() * GREEK_LETTERS.length)] ?? "Ω";
  } while (letter === exclude);
  return letter;
}

function computeCharStates(
  originalText: string,
  dials: EchoDial[]
): ("decoded" | "garbled")[] {
  const states: ("decoded" | "garbled")[] = [];

  for (let i = 0; i < originalText.length; i++) {
    const char = originalText[i]!;

    // Spaces and punctuation are always decoded
    if (char === " " || !GREEK_LETTERS.includes(char.toUpperCase())) {
      states.push("decoded");
      continue;
    }

    // Find all dials that affect this position
    const affectingDials = dials.filter((d) => d.affectedPositions.includes(i));

    if (affectingDials.length === 0) {
      // No dial controls this position — always decoded
      states.push("decoded");
    } else {
      // All affecting dials must be at correct value
      const allCorrect = affectingDials.every(
        (d) => d.currentValue === d.correctValue
      );
      states.push(allCorrect ? "decoded" : "garbled");
    }
  }

  return states;
}

export const echoRelayHandler: PuzzleHandler = {
  init(players: Player[], config: PuzzleConfig): PuzzleState {
    const data = config.data as {
      original_text: string;
      dials: {
        id: string;
        label: string;
        correct_value: number;
        min_value: number;
        max_value: number;
        step: number;
        affected_positions: number[];
      }[];
      garble_characters?: string;
    };

    // Initialize dials with random starting values (not correct)
    const dials: EchoDial[] = data.dials.map((d) => {
      let startValue: number;
      const range = d.max_value - d.min_value;
      do {
        startValue = d.min_value + Math.floor(Math.random() * (range / d.step + 1)) * d.step;
        startValue = Math.min(startValue, d.max_value);
      } while (startValue === d.correct_value && range > 0);

      return {
        id: d.id,
        label: d.label,
        currentValue: startValue,
        correctValue: d.correct_value,
        minValue: d.min_value,
        maxValue: d.max_value,
        step: d.step,
        affectedPositions: d.affected_positions,
      };
    });

    // Generate garble map — one random replacement per character position
    const garbleMap: Record<number, string> = {};
    for (let i = 0; i < data.original_text.length; i++) {
      const original = data.original_text[i]!;
      if (original !== " " && GREEK_LETTERS.includes(original.toUpperCase())) {
        garbleMap[i] = randomGreekLetter(original.toUpperCase());
      }
    }

    const charStates = computeCharStates(data.original_text, dials);

    const puzzleData: EchoRelayData = {
      originalText: data.original_text,
      charStates,
      dials,
      garbleMap,
      wrongSubmissions: 0,
      isFullyDecoded: false,
    };

    return {
      puzzleId: config.id,
      type: "echo_relay" as any,
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
    const puzzleData = state.data as unknown as EchoRelayData;
    let glitchDelta = 0;

    if (action === "set_frequency") {
      const dialId = data.dialId as string;
      const value = data.value as number;

      const dial = puzzleData.dials.find((d) => d.id === dialId);
      if (!dial) return { state, glitchDelta: 0 };

      // Clamp and snap to step
      const clamped = Math.max(dial.minValue, Math.min(dial.maxValue, value));
      const snapped = Math.round((clamped - dial.minValue) / dial.step) * dial.step + dial.minValue;
      dial.currentValue = snapped;

      // Recompute character states
      puzzleData.charStates = computeCharStates(puzzleData.originalText, puzzleData.dials);
    } else if (action === "submit_decode") {
      const allDecoded = puzzleData.charStates.every((s) => s === "decoded");
      if (allDecoded) {
        puzzleData.isFullyDecoded = true;
      } else {
        puzzleData.wrongSubmissions++;
        glitchDelta = 5;
      }
    }

    return {
      state: { ...state, data: puzzleData as unknown as Record<string, unknown> },
      glitchDelta,
    };
  },

  checkWin(state: PuzzleState): boolean {
    const data = state.data as unknown as EchoRelayData;
    return data.isFullyDecoded;
  },

  getPlayerView(
    state: PuzzleState,
    playerId: string,
    playerRole: string,
    config: PuzzleConfig
  ): PlayerView {
    const data = state.data as unknown as EchoRelayData;

    const baseView = {
      playerId,
      role: playerRole,
      puzzleId: state.puzzleId,
      puzzleType: state.type,
      puzzleTitle: config.title,
    };

    const decodedCount = data.charStates.filter((s) => s === "decoded").length;
    const totalChars = data.originalText.length;

    if (playerRole === "Γραφέας") {
      // Scribe sees the text (decoded chars as original, garbled as replacements)
      const displayText = data.originalText
        .split("")
        .map((char, i) => {
          if (data.charStates[i] === "decoded") {
            return char;
          }
          return data.garbleMap[i] ?? char;
        })
        .join("");

      return {
        ...baseView,
        viewData: {
          displayText,
          charStates: data.charStates,
          decodedCount,
          totalChars,
          wrongSubmissions: data.wrongSubmissions,
        },
      };
    } else {
      // Tuner sees dials only (no text, no correct values, no affected positions)
      return {
        ...baseView,
        viewData: {
          dials: data.dials.map((d) => ({
            id: d.id,
            label: d.label,
            currentValue: d.currentValue,
            minValue: d.minValue,
            maxValue: d.maxValue,
            step: d.step,
          })),
          decodedCount,
          totalChars,
          wrongSubmissions: data.wrongSubmissions,
        },
      };
    }
  },
};
