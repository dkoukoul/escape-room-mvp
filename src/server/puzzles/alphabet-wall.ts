import type { PuzzleHandler } from "./puzzle-handler.ts";
import type { Player, PuzzleConfig, PuzzleState, PlayerView } from "../../../shared/types.ts";
import { PuzzleType, PuzzleStatus } from "../../../shared/types.ts";

interface AlphabetWallData {
  words: { easy: string[]; medium: string[]; hard: string[] };
  selectedWords: string[];
  currentRoundIndex: number;
  successfulRounds: number;
  failedRounds: number;
  roundsToPlay: number;
  roundsToWin: number;
  letterGlowDurationMs: number;
  cooldownMs: number;
  guessTimeoutMs: number;

  currentWord: string;
  activeLetter: string | null;
  activeLetterExpiresAt: number | null;
  lastLetterSentAt: number | null;
  roundStartedAt: number;
  sentLettersHistory: string[];
  wrongGuesses: string[];
}

export const alphabetWallHandler: PuzzleHandler = {
  init(players: Player[], config: PuzzleConfig): PuzzleState {
    const data = config.data as {
      words: { easy: string[]; medium: string[]; hard: string[] };
      letter_glow_duration_ms: number;
      cooldown_ms: number;
      guess_timeout_ms: number;
      rounds_to_play: number;
      rounds_to_win: number;
    };

    // Pick words based on rounds to play. Here we just mix them and pick.
    // For 3 rounds, maybe 1 easy, 1 medium, 1 hard.
    const easyPool = [...data.words.easy].sort(() => 0.5 - Math.random());
    const mediumPool = [...data.words.medium].sort(() => 0.5 - Math.random());
    const hardPool = [...data.words.hard].sort(() => 0.5 - Math.random());

    const selectedWords: string[] = [];
    if (data.rounds_to_play >= 1 && easyPool.length > 0) selectedWords.push(easyPool.pop()!);
    if (data.rounds_to_play >= 2 && mediumPool.length > 0) selectedWords.push(mediumPool.pop()!);
    if (data.rounds_to_play >= 3 && hardPool.length > 0) selectedWords.push(hardPool.pop()!);
    
    // Fill the rest randomly from all remaining
    const remainingPool = [...easyPool, ...mediumPool, ...hardPool].sort(() => 0.5 - Math.random());
    while (selectedWords.length < data.rounds_to_play && remainingPool.length > 0) {
      selectedWords.push(remainingPool.pop()!);
    }

    const puzzleData: AlphabetWallData = {
      words: data.words,
      selectedWords,
      currentRoundIndex: 0,
      successfulRounds: 0,
      failedRounds: 0,
      roundsToPlay: data.rounds_to_play,
      roundsToWin: data.rounds_to_win,
      letterGlowDurationMs: data.letter_glow_duration_ms,
      cooldownMs: data.cooldown_ms,
      guessTimeoutMs: data.guess_timeout_ms,

      currentWord: selectedWords[0] || "",
      activeLetter: null,
      activeLetterExpiresAt: null,
      lastLetterSentAt: null,
      roundStartedAt: Date.now(),
      sentLettersHistory: [],
      wrongGuesses: [],
    };

    return {
      puzzleId: config.id,
      type: PuzzleType.ALPHABET_WALL,
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
    const puzzleData = state.data as unknown as AlphabetWallData;
    let glitchDelta = 0;
    const now = Date.now();

    // Check if current active letter has expired naturally
    if (puzzleData.activeLetter && puzzleData.activeLetterExpiresAt && now > puzzleData.activeLetterExpiresAt) {
      puzzleData.activeLetter = null;
    }

    if (action === "send_letter") {
      const letter = actionData.letter as string;
      // Check cooldown
      if (!puzzleData.lastLetterSentAt || (now - puzzleData.lastLetterSentAt) >= puzzleData.cooldownMs) {
        puzzleData.activeLetter = letter;
        puzzleData.activeLetterExpiresAt = now + puzzleData.letterGlowDurationMs;
        puzzleData.lastLetterSentAt = now;
        puzzleData.sentLettersHistory.push(letter);
      }
    } else if (action === "submit_guess") {
      const guess = (actionData.guess as string).toUpperCase().trim();
      if (guess === puzzleData.currentWord) {
        // Correct guess!
        puzzleData.successfulRounds++;
        puzzleData.currentRoundIndex++;
        if (puzzleData.currentRoundIndex < puzzleData.roundsToPlay) {
          // Next round
          puzzleData.currentWord = puzzleData.selectedWords[puzzleData.currentRoundIndex] || "";
          puzzleData.activeLetter = null;
          puzzleData.sentLettersHistory = [];
          puzzleData.wrongGuesses = [];
          puzzleData.roundStartedAt = now;
        }
      } else {
        // Wrong guess
        if (!puzzleData.wrongGuesses.includes(guess)) {
          puzzleData.wrongGuesses.push(guess);
        }
        glitchDelta = 2; // Small penalty for wrong guess
      }
    } else if (action === "timeout") {
      // Round timed out
      puzzleData.failedRounds++;
      puzzleData.currentRoundIndex++;
      glitchDelta = 6; // Big penalty for timeout
      if (puzzleData.currentRoundIndex < puzzleData.roundsToPlay) {
        puzzleData.currentWord = puzzleData.selectedWords[puzzleData.currentRoundIndex] || "";
        puzzleData.activeLetter = null;
        puzzleData.sentLettersHistory = [];
        puzzleData.wrongGuesses = [];
        puzzleData.roundStartedAt = now;
      }
    }

    return { state: { ...state, data: puzzleData as unknown as Record<string, unknown> }, glitchDelta };
  },

  checkWin(state: PuzzleState): boolean {
    const data = state.data as unknown as AlphabetWallData;
    return data.successfulRounds >= data.roundsToWin || data.currentRoundIndex >= data.roundsToPlay;
    // We will handle strictly winning/losing based on successful rounds outside, 
    // but returning true here means puzzle ends.
    // If they run out of rounds but failed too many, checkWin returning true ends it,
    // and GameEngine proceeds. Game engine currently just considers it "completed".
    // In MVP, we just succeed the puzzle if finished to move forward.
  },

  getPlayerView(
    state: PuzzleState,
    playerId: string,
    playerRole: string,
    config: PuzzleConfig
  ): PlayerView {
    const data = state.data as unknown as AlphabetWallData;
    const now = Date.now();
    
    // Evaluate if letter is still active for view
    const isLetterActive = data.activeLetter && data.activeLetterExpiresAt && now < data.activeLetterExpiresAt;
    const activeLetter = isLetterActive ? data.activeLetter : null;
    
    // Calculate time remaining
    const timeElapsed = now - data.roundStartedAt;
    const timeRemaining = Math.max(0, data.guessTimeoutMs - timeElapsed);

    const baseView = {
      playerId,
      role: playerRole,
      puzzleId: state.puzzleId,
      puzzleType: state.type,
      puzzleTitle: config.title,
    };

    if (playerRole === "Trapped") {
      return {
        ...baseView,
        viewData: {
          currentWord: data.currentWord,
          sentHistorySize: data.sentLettersHistory.length,
          lastSentAt: data.lastLetterSentAt,
          cooldownMs: data.cooldownMs,
          timeRemaining,
          currentRound: data.currentRoundIndex + 1,
          totalRounds: data.roundsToPlay,
        },
      };
    } else {
      return {
        ...baseView,
        viewData: {
          activeLetter,
          sentHistorySize: data.sentLettersHistory.length,
          wrongGuesses: data.wrongGuesses,
          timeRemaining,
          currentRound: data.currentRoundIndex + 1,
          totalRounds: data.roundsToPlay,
        },
      };
    }
  },
};
