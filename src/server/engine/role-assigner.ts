// ============================================================
// Role Assigner — Assigns roles to players for each puzzle
// ============================================================

import type { Player, PuzzleConfig, RoleAssignment, PuzzleRoleDefinition } from "../../../shared/types.ts";

/**
 * Shuffle array in place (Fisher-Yates)
 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

import logger from "../logger.ts";

/**
 * Assign roles to players based on the puzzle's layout configuration.
 * Players are shuffled so roles are randomized each time.
 */
export function assignRoles(
  players: Player[],
  puzzleConfig: PuzzleConfig
): RoleAssignment[] {
  try {
    const shuffledPlayers = shuffle([...players]);
    const assignments: RoleAssignment[] = [];
    let playerIndex = 0;

    const roles = puzzleConfig.layout.roles;

    // First pass: assign roles with explicit counts
    for (const roleDef of roles) {
      if (roleDef.count === "remaining") continue;

      const count = Math.min(roleDef.count, shuffledPlayers.length - playerIndex);
      for (let i = 0; i < count && playerIndex < shuffledPlayers.length; i++) {
        const player = shuffledPlayers[playerIndex]!;
        assignments.push({
          playerId: player.id,
          playerName: player.name,
          role: roleDef.name,
        });
        player.role = roleDef.name;
        playerIndex++;
      }
    }

    // Second pass: assign "remaining" players
    const remainingRole = roles.find((r) => r.count === "remaining");
    if (remainingRole) {
      while (playerIndex < shuffledPlayers.length) {
        const player = shuffledPlayers[playerIndex]!;
        assignments.push({
          playerId: player.id,
          playerName: player.name,
          role: remainingRole.name,
        });
        player.role = remainingRole.name;
        playerIndex++;
      }
    }

    // Handle single-player debug mode: if only 1 player, give them all roles info
    if (players.length === 1 && assignments.length === 1) {
      logger.debug(`[RoleAssigner] Debug mode: single player gets role "${assignments[0]!.role}"`);
    }

    return assignments;
  } catch (err) {
    logger.error("Error assigning roles", { err, playerCount: players.length, puzzleId: puzzleConfig.id });
    return [];
  }
}
