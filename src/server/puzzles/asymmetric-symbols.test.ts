import { describe, expect, test } from "bun:test"
import { asymmetricSymbolsHandler } from './asymmetric-symbols.ts'
import { type Player, type PuzzleConfig, type PuzzleState, type PlayerView, type PuzzleLayout, PuzzleType, PuzzleStatus } from "../../../shared/types.ts";

const mockPuzzleConfig: PuzzleConfig = {
  id: "neon_propylaea",
  type: PuzzleType.ASYMMETRIC_SYMBOLS,
  title: "Τα Νέον Προπύλαια",
  briefing: "Η πύλη για την Ακρόπολη έχει μολυνθεί. Θραύσματα αρχαίων λέξεων διαλύονται στο ψηφιακό κενό. Ο Navigator μπορεί ακόμα να διαβάσει τις αρχικές επιγραφές — αλλά οι Decoders πρέπει να πιάσουν τα ιπτάμενα γράμματα πριν χαθούν για πάντα.\n",
  layout: {
    roles: [
      { "name": "Navigator", "count": 1, "description": "Βλέπεις τις αρχαίες λέξεις. Καθοδήγησε την ομάδα σου." },
      { "name": "Decoder", "count": "remaining", "description": "Πιάσε τα γράμματα για να σχηματίσεις τη λέξη." }
    ]
  },
  data: {
    solution_words: ["ΦΙΛΟΣΟΦΙΑ", "ΔΗΜΟΚΡΑΤΙΑ", "ΗΡΩΣ", "ΠΑΡΘΕΝΩΝ", "ΑΚΡΟΠΟΛΙΣ", "ΣΩΚΡΑΤΗΣ", "ΠΛΑΤΩΝ", "ΑΡΙΣΤΟΤΕΛΗΣ", "ΟΛΥΜΠΟΣ", "ΘΕΟΣ", "ΜΥΘΟΛΟΓΙΑ", "ΤΡΑΓΩΔΙΑ", "ΚΩΜΩΔΙΑ", "ΘΕΑΤΡΟ", "ΑΓΟΡΑ", "ΣΥΜΠΟΣΙΟ", "ΑΘΛΗΤΗΣ", "ΟΛΥΜΠΙΑ", "ΜΑΡΑΘΩΝ", "ΣΠΑΡΤΗ", "ΑΘΗΝΑ", "ΠΟΣΕΙΔΩΝ", "ΖΕΥΣ", "ΗΡΑ", "ΑΠΟΛΛΩΝ", "ΑΡΤΕΜΙΣ", "ΕΡΜΗΣ", "ΑΦΡΟΔΙΤΗ", "ΗΦΑΙΣΤΟΣ", "ΑΡΗΣ", "ΔΙΟΝΥΣΟΣ", "ΠΕΡΙΚΛΗΣ", "ΛΕΩΝΙΔΑΣ", "ΑΛΕΞΑΝΔΡΟΣ", "ΟΜΗΡΟΣ", "ΙΛΙΑΔΑ", "ΟΔΥΣΣΕΙΑ", "ΤΡΟΙΑ", "ΕΛΕΝΗ", "ΑΧΙΛΛΕΑΣ", "ΕΚΤΩΡ", "ΟΔΥΣΣΕΥΣ", "ΠΗΝΕΛΟΠΗ", "ΤΕΛΕΜΑΧΟΣ", "ΚΥΚΛΩΨ", "ΣΕΙΡΗΝΑ", "ΧΙΜΑΙΡΑ", "ΜΕΔΟΥΣΑ", "ΠΗΓΑΣΟΣ", "ΚΕΝΤΑΥΡΟΣ", "ΜΙΝΩΤΑΥΡΟΣ", "ΛΑΒΥΡΙΝΘΟΣ", "ΚΝΩΣΟΣ", "ΜΥΚΗΝΕΣ", "ΔΕΛΦΟΙ", "ΜΑΝΤΕΙΟ", "ΠΥΘΙΑ", "ΧΡΗΣΜΟΣ", "ΑΜΦΙΘΕΑΤΡΟ", "ΠΝΥΚΑ"],
    rounds_to_play: 2,
    glitch_speed: "medium",
    letter_lifetime_ms: 4000,
    spawn_interval_ms: 600,
    decoy_ratio: 0.3
  },
  glitch_penalty: 4,
  audio_cues: {
    start: "puzzle_start.mp3",
    success: "puzzle_success.mp3",
    background: "Neon Breach Protocol.mp3",
    fail: "error.mp3"
  }
};

describe("asymmetricSymbolsHandler", () => {
  describe("init", () => {
    test("should initialize the puzzle state correctly", () => {
      const players: Player[] = [];

      const initialState = asymmetricSymbolsHandler.init(players, mockPuzzleConfig);
      expect(initialState.puzzleId).toBe("neon_propylaea");
      expect(initialState.type).toBe(PuzzleType.ASYMMETRIC_SYMBOLS);
      expect(initialState.status).toBe(PuzzleStatus.ACTIVE);
    });

    test("should shuffle the solution words", () => {
      // This test assumes that shuffling works correctly
      const players: Player[] = [];

      const initialState1 = asymmetricSymbolsHandler.init(players, mockPuzzleConfig);
      const initialState2 = asymmetricSymbolsHandler.init(players, mockPuzzleConfig);

      expect(initialState1.data.solutionWords).not.toEqual(initialState2.data.solutionWords);
    });

    test("should limit the number of rounds if specified", () => {
      const players: Player[] = [];

      const initialState: PuzzleState = asymmetricSymbolsHandler.init(players, mockPuzzleConfig);
      const words = initialState.data.solutionWords;
      expect((words as string[]).length).toBe(2);
    });
  });

  describe("handleAction", () => {
    test("should handle correct letter capture correctly", () => {
      const state: PuzzleState = {
        puzzleId: "1",
        type: PuzzleType.ASYMMETRIC_SYMBOLS,
        status: PuzzleStatus.ACTIVE,
        data: {
          solutionWords: ["example"],
          currentWordIndex: 0,
          capturedLetters: ["_", "_", "_", "_", "_", "_", "_"],
          capturedBy: {},
          wrongCaptures: 0,
          completedWords: [],
        },
      };
      const playerId = "player1";
      const action = "capture_letter";
      const data = { letter: "e" };

      const { state: newState, glitchDelta } = asymmetricSymbolsHandler.handleAction(state, playerId, action, data);
      expect(newState.data.capturedLetters).toEqual(["e", "_", "_", "_", "_", "_", "_"]);
      expect(glitchDelta).toBe(0);
    });

    test("should handle wrong letter capture correctly", () => {
      const state: PuzzleState = {
        puzzleId: "1",
        type: PuzzleType.ASYMMETRIC_SYMBOLS,
        status: PuzzleStatus.ACTIVE,
        data: {
          solutionWords: ["example"],
          currentWordIndex: 0,
          capturedLetters: ["_", "_", "_", "_", "_", "_", "_"],
          capturedBy: {},
          wrongCaptures: 0,
          completedWords: [],
        },
      };
      const playerId = "player1";
      const action = "capture_letter";
      const data = { letter: "Α" };

      const { state: newState, glitchDelta } = asymmetricSymbolsHandler.handleAction(state, playerId, action, data);
      expect(newState.data.wrongCaptures).toBe(1);
      expect(glitchDelta).toBe(5); // Assuming a default glitch penalty of 5
    });
  });

  describe("checkWin", () => {
    test("should return true if all words are completed", () => {
      const state: PuzzleState = {
        puzzleId: "1",
        type: PuzzleType.ASYMMETRIC_SYMBOLS,
        status: PuzzleStatus.ACTIVE,
        data: {
          solutionWords: ["example"],
          currentWordIndex: 0,
          capturedLetters: ["_", "_", "_", "_", "_", "_", "_"],
          capturedBy: {},
          wrongCaptures: 0,
          completedWords: ["example"],
        },
      };

      expect(asymmetricSymbolsHandler.checkWin(state)).toBe(true);
    });

    test("should return false if not all words are completed", () => {
      const state: PuzzleState = {
        puzzleId: "1",
        type: PuzzleType.ASYMMETRIC_SYMBOLS,
        status: PuzzleStatus.ACTIVE,
        data: {
          solutionWords: ["example", "test"],
          currentWordIndex: 0,
          capturedLetters: ["_", "_", "_", "_", "_", "_", "_"],
          capturedBy: {},
          wrongCaptures: 0,
          completedWords: [],
        },
      };

      expect(asymmetricSymbolsHandler.checkWin(state)).toBe(false);
    });
  });

  describe("getPlayerView", () => {
    test("should return the correct view for a Navigator", () => {
      const state: PuzzleState = {
        puzzleId: "1",
        type: PuzzleType.ASYMMETRIC_SYMBOLS,
        status: PuzzleStatus.ACTIVE,
        data: {
          solutionWords: ["example"],
          currentWordIndex: 0,
          capturedLetters: ["_", "_", "_", "_", "_", "_", "_"],
          capturedBy: {},
          wrongCaptures: 0,
          completedWords: [],
        },
      };
      const playerId = "player1";
      const playerRole = "Navigator";

      const view = asymmetricSymbolsHandler.getPlayerView(state, playerId, playerRole, mockPuzzleConfig);
      expect(view.viewData.solutionWords).toEqual(["example"]);
      expect(view.viewData.currentWordIndex).toBe(0);
      expect(view.viewData.capturedLetters).toEqual(["_", "_", "_", "_", "_", "_", "_"]);
      expect(view.viewData.completedWords).toEqual([]);
    });

    test("should return the correct view for a Decoder", () => {
      const state: PuzzleState = {
        puzzleId: "1",
        type: PuzzleType.ASYMMETRIC_SYMBOLS,
        status: PuzzleStatus.ACTIVE,
        data: {
          solutionWords: ["example"],
          currentWordIndex: 0,
          capturedLetters: ["_", "_", "_", "_", "_", "_", "_"],
          capturedBy: {},
          wrongCaptures: 0,
          completedWords: [],
        },
      };
      const playerId = "player1";
      const playerRole = "Decoder";

      const view = asymmetricSymbolsHandler.getPlayerView(state, playerId, playerRole, mockPuzzleConfig);
      expect(view.viewData.currentWordLength).toBe(7);
      expect(view.viewData.capturedLetters).toEqual(["_", "_", "_", "_", "_", "_", "_"]);
      expect(view.viewData.completedWords).toEqual(0);
    });
  });
});