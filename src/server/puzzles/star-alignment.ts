// ============================================================
// Puzzle: Star Alignment — The Constellation Map
// ============================================================
// Astronomer sees full constellation and moves gold stars;
// Navigators see blue guide lines and move blue stars.

import type { PuzzleHandler } from "./puzzle-handler.ts";
import type { Player, PuzzleConfig, PuzzleState, PlayerView } from "../../../shared/types.ts";

interface Star {
  id: string;
  color: "gold" | "blue";
  currentRow: number;
  currentCol: number;
  targetRow: number;
  targetCol: number;
  locked: boolean;
  lockUntil: number;
}

interface GuideLine {
  from: { row: number; col: number };
  to: { row: number; col: number };
}

interface StarAlignmentData {
  gridRows: number;
  gridCols: number;
  stars: Star[];
  guideLines: GuideLine[];
  selectedStarId: Record<string, string | null>;
  wrongPlacements: number;
}

function getRoleColors(role: string): string[] {
  if (role === "Αστρονόμος") return ["gold"];
  if (role === "Πλοηγός") return ["blue"];
  return [];
}

function filterGuideLinesForRole(
  guideLines: GuideLine[],
  stars: Star[],
  role: string
): GuideLine[] {
  if (role === "Αστρονόμος") {
    // Astronomer sees ALL guide lines
    return guideLines;
  }

  // Navigator sees only lines connecting blue star targets
  const blueTargets = new Set(
    stars
      .filter((s) => s.color === "blue")
      .map((s) => `${s.targetRow},${s.targetCol}`)
  );

  return guideLines.filter((line) => {
    const fromKey = `${line.from.row},${line.from.col}`;
    const toKey = `${line.to.row},${line.to.col}`;
    return blueTargets.has(fromKey) || blueTargets.has(toKey);
  });
}

export const starAlignmentHandler: PuzzleHandler = {
  init(players: Player[], config: PuzzleConfig): PuzzleState {
    const data = config.data as {
      grid_rows: number;
      grid_cols: number;
      stars: {
        id: string;
        color: "gold" | "blue";
        start_row: number;
        start_col: number;
        target_row: number;
        target_col: number;
      }[];
      guide_lines: { from: number[]; to: number[] }[];
    };

    const stars: Star[] = data.stars.map((s) => ({
      id: s.id,
      color: s.color,
      currentRow: s.start_row,
      currentCol: s.start_col,
      targetRow: s.target_row,
      targetCol: s.target_col,
      locked: false,
      lockUntil: 0,
    }));

    const guideLines: GuideLine[] = data.guide_lines.map((gl) => ({
      from: { row: gl.from[0] ?? 0, col: gl.from[1] ?? 0 },
      to: { row: gl.to[0] ?? 0, col: gl.to[1] ?? 0 },
    }));

    const puzzleData: StarAlignmentData = {
      gridRows: data.grid_rows,
      gridCols: data.grid_cols,
      stars,
      guideLines,
      selectedStarId: {},
      wrongPlacements: 0,
    };

    return {
      puzzleId: config.id,
      type: "star_alignment" as any,
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
    const puzzleData = state.data as unknown as StarAlignmentData;
    let glitchDelta = 0;

    if (action === "select_star") {
      const starId = data.starId as string;
      const star = puzzleData.stars.find((s) => s.id === starId);
      if (!star) return { state, glitchDelta: 0 };

      // Check if star is locked
      if (star.locked && Date.now() < star.lockUntil) {
        return { state, glitchDelta: 0 };
      }

      // Unlock if lock expired
      if (star.locked && Date.now() >= star.lockUntil) {
        star.locked = false;
        star.lockUntil = 0;
      }

      puzzleData.selectedStarId[playerId] = starId;
    } else if (action === "place_star") {
      const row = data.row as number;
      const col = data.col as number;

      const selectedId = puzzleData.selectedStarId[playerId];
      if (!selectedId) return { state, glitchDelta: 0 };

      const star = puzzleData.stars.find((s) => s.id === selectedId);
      if (!star) return { state, glitchDelta: 0 };

      // Bounds check
      if (row < 0 || row >= puzzleData.gridRows || col < 0 || col >= puzzleData.gridCols) {
        return { state, glitchDelta: 0 };
      }

      // Check if another star already occupies the target cell
      const occupied = puzzleData.stars.some(
        (s) => s.id !== star.id && s.currentRow === row && s.currentCol === col
      );
      if (occupied) return { state, glitchDelta: 0 };

      // Same position — no-op
      if (star.currentRow === row && star.currentCol === col) {
        puzzleData.selectedStarId[playerId] = null;
        return { state: { ...state, data: puzzleData as unknown as Record<string, unknown> }, glitchDelta: 0 };
      }

      // Move the star
      star.currentRow = row;
      star.currentCol = col;

      // Clear selection
      puzzleData.selectedStarId[playerId] = null;

      // Check correctness
      if (row === star.targetRow && col === star.targetCol) {
        // Correct placement — no penalty
      } else {
        // Wrong placement — lock and penalize
        star.locked = true;
        star.lockUntil = Date.now() + 3000; // 3-second lock
        puzzleData.wrongPlacements++;
        glitchDelta = 5;
      }
    } else if (action === "deselect_star") {
      puzzleData.selectedStarId[playerId] = null;
    }

    return {
      state: { ...state, data: puzzleData as unknown as Record<string, unknown> },
      glitchDelta,
    };
  },

  checkWin(state: PuzzleState): boolean {
    const data = state.data as unknown as StarAlignmentData;
    return data.stars.every(
      (s) => s.currentRow === s.targetRow && s.currentCol === s.targetCol
    );
  },

  getPlayerView(
    state: PuzzleState,
    playerId: string,
    playerRole: string,
    config: PuzzleConfig
  ): PlayerView {
    const data = state.data as unknown as StarAlignmentData;
    const now = Date.now();
    const canMoveColors = getRoleColors(playerRole);
    const visibleGuideLines = filterGuideLinesForRole(data.guideLines, data.stars, playerRole);

    return {
      playerId,
      role: playerRole,
      puzzleId: state.puzzleId,
      puzzleType: state.type,
      puzzleTitle: config.title,
      viewData: {
        gridRows: data.gridRows,
        gridCols: data.gridCols,
        stars: data.stars.map((s) => ({
          id: s.id,
          color: s.color,
          currentRow: s.currentRow,
          currentCol: s.currentCol,
          locked: s.locked && now < s.lockUntil,
          correct: s.currentRow === s.targetRow && s.currentCol === s.targetCol,
        })),
        guideLines: visibleGuideLines,
        selectedStarId: data.selectedStarId[playerId] ?? null,
        canMoveColors,
        wrongPlacements: data.wrongPlacements,
      },
    };
  },
};
