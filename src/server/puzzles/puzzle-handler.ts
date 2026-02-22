// ============================================================
// Puzzle Handler — Interface for all puzzle types
// ============================================================

import type { Player, PuzzleConfig, PuzzleState, PlayerView } from "../../../shared/types.ts";

/**
 * Every puzzle type must implement this interface.
 * The engine calls these methods to manage puzzle lifecycle.
 */
export interface PuzzleHandler {
  /**
   * Initialize puzzle state for the given players and config
   */
  init(players: Player[], config: PuzzleConfig): PuzzleState;

  /**
   * Handle a player action. Returns updated state and glitch delta.
   */
  handleAction(
    state: PuzzleState,
    playerId: string,
    action: string,
    data: Record<string, unknown>
  ): { state: PuzzleState; glitchDelta: number };

  /**
   * Check if the puzzle has been completed successfully
   */
  checkWin(state: PuzzleState): boolean;

  /**
   * Get the view data for a specific player based on their role.
   * This is how asymmetric information is enforced — each role
   * sees different data.
   */
  getPlayerView(
    state: PuzzleState,
    playerId: string,
    playerRole: string,
    config: PuzzleConfig
  ): PlayerView;
}

// Registry of puzzle handlers by type
const handlers = new Map<string, PuzzleHandler>();

export function registerPuzzleHandler(type: string, handler: PuzzleHandler): void {
  handlers.set(type, handler);
  console.log(`[PuzzleRegistry] Registered handler: ${type}`);
}

export function getPuzzleHandler(type: string): PuzzleHandler | undefined {
  return handlers.get(type);
}
