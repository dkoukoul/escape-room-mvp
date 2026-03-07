import { describe, expect, test } from "bun:test";
import { echoRelayHandler } from "./echo-relay.ts";
import { type Player, type PuzzleConfig, type PuzzleState, PuzzleType, PuzzleStatus } from "../../../shared/types.ts";

const mockConfig: PuzzleConfig = {
  id: "test_echo",
  type: PuzzleType.ECHO_RELAY,
  title: "Test Echo",
  briefing: "Test briefing",
  layout: {
    roles: [
      { name: "Γραφέας", count: 1, description: "Scribe" },
      { name: "Συντονιστής", count: "remaining", description: "Tuner" },
    ],
  },
  data: {
    original_text: "ΓΝΩΘΙ ΣΑΥΤΟΝ",
    dials: [
      { id: "d1", label: "Dial A", correct_value: 5, min_value: 1, max_value: 10, step: 1, affected_positions: [0, 1, 2, 3, 4] },
      { id: "d2", label: "Dial B", correct_value: 3, min_value: 1, max_value: 10, step: 1, affected_positions: [3, 4, 6, 7, 8] },
      { id: "d3", label: "Dial C", correct_value: 8, min_value: 1, max_value: 10, step: 1, affected_positions: [8, 9, 10, 11] },
    ],
    garble_characters: "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ",
  },
  glitch_penalty: 5,
};

const mockPlayers: Player[] = [
  { id: "p1", name: "Alice", roomCode: "test", role: null, isHost: true, connected: true },
  { id: "p2", name: "Bob", roomCode: "test", role: null, isHost: false, connected: true },
];

// Helper: create a state with all dials set to specific values
function createStateWithDialValues(values: Record<string, number>): PuzzleState {
  return {
    puzzleId: "test_echo",
    type: PuzzleType.ECHO_RELAY,
    status: PuzzleStatus.ACTIVE,
    data: {
      originalText: "ΓΝΩΘΙ ΣΑΥΤΟΝ",
      charStates: Array(12).fill("garbled"),
      dials: [
        { id: "d1", label: "Dial A", currentValue: values.d1 ?? 1, correctValue: 5, minValue: 1, maxValue: 10, step: 1, affectedPositions: [0, 1, 2, 3, 4] },
        { id: "d2", label: "Dial B", currentValue: values.d2 ?? 1, correctValue: 3, minValue: 1, maxValue: 10, step: 1, affectedPositions: [3, 4, 6, 7, 8] },
        { id: "d3", label: "Dial C", currentValue: values.d3 ?? 1, correctValue: 8, minValue: 1, maxValue: 10, step: 1, affectedPositions: [8, 9, 10, 11] },
      ],
      garbleMap: { 0: "Ω", 1: "Ψ", 2: "Χ", 3: "Φ", 4: "Υ", 6: "Τ", 7: "Σ", 8: "Ρ", 9: "Π", 10: "Ξ", 11: "Λ" },
      wrongSubmissions: 0,
      isFullyDecoded: false,
    } as unknown as Record<string, unknown>,
  };
}

describe("echoRelayHandler", () => {
  describe("init", () => {
    test("should initialize puzzle state correctly", () => {
      const state = echoRelayHandler.init(mockPlayers, mockConfig);

      expect(state.puzzleId).toBe("test_echo");
      expect(state.type).toBe(PuzzleType.ECHO_RELAY);
      expect(state.status).toBe(PuzzleStatus.ACTIVE);
      expect(state.data.originalText).toBe("ΓΝΩΘΙ ΣΑΥΤΟΝ");
      expect(state.data.isFullyDecoded).toBe(false);
      expect(state.data.wrongSubmissions).toBe(0);
    });

    test("should initialize dials with non-correct starting values", () => {
      const state = echoRelayHandler.init(mockPlayers, mockConfig);
      const dials = state.data.dials as { currentValue: number; correctValue: number }[];

      for (const dial of dials) {
        expect(dial.currentValue).not.toBe(dial.correctValue);
      }
    });

    test("should create garble map for letter positions", () => {
      const state = echoRelayHandler.init(mockPlayers, mockConfig);
      const garbleMap = state.data.garbleMap as Record<number, string>;

      // Position 5 is a space, should not be in garble map
      expect(garbleMap[5]).toBeUndefined();
      // Position 0 is "Γ", should have a garbled replacement that is not "Γ"
      expect(garbleMap[0]).toBeDefined();
      expect(garbleMap[0]).not.toBe("Γ");
    });

    test("should set space character as always decoded", () => {
      const state = echoRelayHandler.init(mockPlayers, mockConfig);
      const charStates = state.data.charStates as string[];

      // Index 5 is a space in "ΓΝΩΘΙ ΣΑΥΤΟΝ" — should always be decoded
      expect(charStates[5]).toBe("decoded");
    });
  });

  describe("handleAction — set_frequency", () => {
    test("should update dial value", () => {
      const state = createStateWithDialValues({ d1: 1, d2: 1, d3: 1 });
      const { state: newState, glitchDelta } = echoRelayHandler.handleAction(
        state, "p2", "set_frequency", { dialId: "d1", value: 7 }
      );

      const dials = newState.data.dials as { id: string; currentValue: number }[];
      const d1 = dials.find(d => d.id === "d1")!;
      expect(d1.currentValue).toBe(7);
      expect(glitchDelta).toBe(0); // No penalty for adjusting
    });

    test("should clamp value to dial range", () => {
      const state = createStateWithDialValues({ d1: 1, d2: 1, d3: 1 });
      const { state: newState } = echoRelayHandler.handleAction(
        state, "p2", "set_frequency", { dialId: "d1", value: 99 }
      );

      const dials = newState.data.dials as { id: string; currentValue: number }[];
      const d1 = dials.find(d => d.id === "d1")!;
      expect(d1.currentValue).toBe(10); // Max is 10
    });

    test("should decode characters when all affecting dials are correct", () => {
      // Set d1=5 (correct). Positions 0,1,2 are only affected by d1 → should become decoded
      const state = createStateWithDialValues({ d1: 1, d2: 1, d3: 1 });
      const { state: newState } = echoRelayHandler.handleAction(
        state, "p2", "set_frequency", { dialId: "d1", value: 5 }
      );

      const charStates = newState.data.charStates as string[];
      // Positions 0,1,2 are only affected by d1 → decoded
      expect(charStates[0]).toBe("decoded");
      expect(charStates[1]).toBe("decoded");
      expect(charStates[2]).toBe("decoded");
      // Position 3 affected by d1 AND d2 → d2 is still wrong → garbled
      expect(charStates[3]).toBe("garbled");
    });

    test("overlapping positions need ALL dials correct", () => {
      // Position 3 and 4 are affected by both d1 and d2
      const state = createStateWithDialValues({ d1: 5, d2: 1, d3: 1 });
      const charStates1 = state.data.charStates as string[];
      // d1 is correct but d2 is wrong → positions 3,4 still garbled
      // (need to trigger recompute via set_frequency)
      const { state: s1 } = echoRelayHandler.handleAction(
        state, "p2", "set_frequency", { dialId: "d1", value: 5 }
      );
      const cs1 = s1.data.charStates as string[];
      expect(cs1[3]).toBe("garbled");
      expect(cs1[4]).toBe("garbled");

      // Now set d2 to correct
      const { state: s2 } = echoRelayHandler.handleAction(
        s1, "p2", "set_frequency", { dialId: "d2", value: 3 }
      );
      const cs2 = s2.data.charStates as string[];
      expect(cs2[3]).toBe("decoded");
      expect(cs2[4]).toBe("decoded");
    });

    test("should ignore unknown dial id", () => {
      const state = createStateWithDialValues({ d1: 1, d2: 1, d3: 1 });
      const { state: newState, glitchDelta } = echoRelayHandler.handleAction(
        state, "p2", "set_frequency", { dialId: "nonexistent", value: 5 }
      );
      expect(glitchDelta).toBe(0);
    });
  });

  describe("handleAction — submit_decode", () => {
    test("should set isFullyDecoded when all characters are decoded", () => {
      // All dials correct → all chars decoded
      const state = createStateWithDialValues({ d1: 5, d2: 3, d3: 8 });
      // Need to trigger recompute
      const { state: s1 } = echoRelayHandler.handleAction(
        state, "p2", "set_frequency", { dialId: "d1", value: 5 }
      );
      const { state: s2, glitchDelta } = echoRelayHandler.handleAction(
        s1, "p2", "submit_decode", {}
      );

      expect(s2.data.isFullyDecoded).toBe(true);
      expect(glitchDelta).toBe(0);
    });

    test("should apply glitch when submitting with garbled characters", () => {
      const state = createStateWithDialValues({ d1: 1, d2: 1, d3: 1 });
      // Trigger recompute so charStates reflect the wrong values
      const { state: s1 } = echoRelayHandler.handleAction(
        state, "p2", "set_frequency", { dialId: "d1", value: 1 }
      );
      const { state: s2, glitchDelta } = echoRelayHandler.handleAction(
        s1, "p2", "submit_decode", {}
      );

      expect(s2.data.isFullyDecoded).toBe(false);
      expect(s2.data.wrongSubmissions).toBe(1);
      expect(glitchDelta).toBe(5);
    });
  });

  describe("checkWin", () => {
    test("should return true when fully decoded", () => {
      const state: PuzzleState = {
        puzzleId: "test",
        type: PuzzleType.ECHO_RELAY,
        status: PuzzleStatus.ACTIVE,
        data: { isFullyDecoded: true } as unknown as Record<string, unknown>,
      };
      expect(echoRelayHandler.checkWin(state)).toBe(true);
    });

    test("should return false when not fully decoded", () => {
      const state: PuzzleState = {
        puzzleId: "test",
        type: PuzzleType.ECHO_RELAY,
        status: PuzzleStatus.ACTIVE,
        data: { isFullyDecoded: false } as unknown as Record<string, unknown>,
      };
      expect(echoRelayHandler.checkWin(state)).toBe(false);
    });
  });

  describe("getPlayerView", () => {
    test("Scribe should see display text and char states but NOT dials", () => {
      const state = createStateWithDialValues({ d1: 5, d2: 1, d3: 1 });
      // Trigger recompute
      const { state: s1 } = echoRelayHandler.handleAction(
        state, "p2", "set_frequency", { dialId: "d1", value: 5 }
      );

      const view = echoRelayHandler.getPlayerView(s1, "p1", "Γραφέας", mockConfig);

      expect(view.role).toBe("Γραφέας");
      expect(view.viewData.displayText).toBeDefined();
      expect(view.viewData.charStates).toBeDefined();
      expect(view.viewData.decodedCount).toBeDefined();
      expect(view.viewData.totalChars).toBe(12);
      expect(view.viewData.dials).toBeUndefined();
    });

    test("Scribe should see original chars for decoded positions", () => {
      // All correct
      const state = createStateWithDialValues({ d1: 5, d2: 3, d3: 8 });
      const { state: s1 } = echoRelayHandler.handleAction(
        state, "p2", "set_frequency", { dialId: "d1", value: 5 }
      );

      const view = echoRelayHandler.getPlayerView(s1, "p1", "Γραφέας", mockConfig);
      const displayText = view.viewData.displayText as string;

      expect(displayText).toBe("ΓΝΩΘΙ ΣΑΥΤΟΝ");
    });

    test("Tuner should see dials but NOT text or correct values", () => {
      const state = createStateWithDialValues({ d1: 1, d2: 1, d3: 1 });
      const { state: s1 } = echoRelayHandler.handleAction(
        state, "p2", "set_frequency", { dialId: "d1", value: 1 }
      );

      const view = echoRelayHandler.getPlayerView(s1, "p2", "Συντονιστής", mockConfig);

      expect(view.role).toBe("Συντονιστής");
      expect(view.viewData.dials).toBeDefined();
      expect(view.viewData.displayText).toBeUndefined();
      expect(view.viewData.charStates).toBeUndefined();

      // Dials should NOT expose correctValue or affectedPositions
      const dials = view.viewData.dials as Record<string, unknown>[];
      for (const dial of dials) {
        expect(dial.correctValue).toBeUndefined();
        expect(dial.affectedPositions).toBeUndefined();
      }
    });

    test("both roles should see decoded count and wrong submissions", () => {
      const state = createStateWithDialValues({ d1: 1, d2: 1, d3: 1 });
      const { state: s1 } = echoRelayHandler.handleAction(
        state, "p2", "set_frequency", { dialId: "d1", value: 1 }
      );

      const scribeView = echoRelayHandler.getPlayerView(s1, "p1", "Γραφέας", mockConfig);
      const tunerView = echoRelayHandler.getPlayerView(s1, "p2", "Συντονιστής", mockConfig);

      expect(scribeView.viewData.decodedCount).toBeDefined();
      expect(tunerView.viewData.decodedCount).toBeDefined();
      expect(scribeView.viewData.wrongSubmissions).toBeDefined();
      expect(tunerView.viewData.wrongSubmissions).toBeDefined();
    });
  });
});
