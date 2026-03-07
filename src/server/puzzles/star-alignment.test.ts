import { describe, expect, test } from "bun:test";
import { starAlignmentHandler } from "./star-alignment.ts";
import { type Player, type PuzzleConfig, type PuzzleState, PuzzleType, PuzzleStatus } from "../../../shared/types.ts";

const mockConfig: PuzzleConfig = {
  id: "test_stars",
  type: PuzzleType.STAR_ALIGNMENT,
  title: "Test Stars",
  briefing: "Test briefing",
  layout: {
    roles: [
      { name: "Αστρονόμος", count: 1, description: "Astronomer" },
      { name: "Πλοηγός", count: "remaining", description: "Navigator" },
    ],
  },
  data: {
    grid_rows: 6,
    grid_cols: 6,
    stars: [
      { id: "g1", color: "gold", start_row: 0, start_col: 0, target_row: 2, target_col: 3 },
      { id: "g2", color: "gold", start_row: 0, start_col: 1, target_row: 4, target_col: 5 },
      { id: "b1", color: "blue", start_row: 5, start_col: 5, target_row: 1, target_col: 4 },
      { id: "b2", color: "blue", start_row: 5, start_col: 4, target_row: 3, target_col: 1 },
    ],
    guide_lines: [
      { from: [2, 3], to: [4, 5] },
      { from: [1, 4], to: [3, 1] },
      { from: [2, 3], to: [1, 4] },
    ],
  },
  glitch_penalty: 5,
};

const mockPlayers: Player[] = [
  { id: "p1", name: "Alice", roomCode: "test", role: null, isHost: true, connected: true },
  { id: "p2", name: "Bob", roomCode: "test", role: null, isHost: false, connected: true },
];

function createState(): PuzzleState {
  return {
    puzzleId: "test_stars",
    type: PuzzleType.STAR_ALIGNMENT,
    status: PuzzleStatus.ACTIVE,
    data: {
      gridRows: 6,
      gridCols: 6,
      stars: [
        { id: "g1", color: "gold", currentRow: 0, currentCol: 0, targetRow: 2, targetCol: 3, locked: false, lockUntil: 0 },
        { id: "g2", color: "gold", currentRow: 0, currentCol: 1, targetRow: 4, targetCol: 5, locked: false, lockUntil: 0 },
        { id: "b1", color: "blue", currentRow: 5, currentCol: 5, targetRow: 1, targetCol: 4, locked: false, lockUntil: 0 },
        { id: "b2", color: "blue", currentRow: 5, currentCol: 4, targetRow: 3, targetCol: 1, locked: false, lockUntil: 0 },
      ],
      guideLines: [
        { from: { row: 2, col: 3 }, to: { row: 4, col: 5 } },
        { from: { row: 1, col: 4 }, to: { row: 3, col: 1 } },
        { from: { row: 2, col: 3 }, to: { row: 1, col: 4 } },
      ],
      selectedStarId: {},
      wrongPlacements: 0,
    } as unknown as Record<string, unknown>,
  };
}

describe("starAlignmentHandler", () => {
  describe("init", () => {
    test("should initialize puzzle state correctly", () => {
      const state = starAlignmentHandler.init(mockPlayers, mockConfig);

      expect(state.puzzleId).toBe("test_stars");
      expect(state.type).toBe(PuzzleType.STAR_ALIGNMENT);
      expect(state.status).toBe(PuzzleStatus.ACTIVE);
      expect(state.data.gridRows).toBe(6);
      expect(state.data.gridCols).toBe(6);
      expect(state.data.wrongPlacements).toBe(0);
    });

    test("should place stars at start positions", () => {
      const state = starAlignmentHandler.init(mockPlayers, mockConfig);
      const stars = state.data.stars as { id: string; currentRow: number; currentCol: number }[];

      const g1 = stars.find(s => s.id === "g1")!;
      expect(g1.currentRow).toBe(0);
      expect(g1.currentCol).toBe(0);
    });

    test("should initialize all stars as unlocked", () => {
      const state = starAlignmentHandler.init(mockPlayers, mockConfig);
      const stars = state.data.stars as { locked: boolean }[];

      for (const star of stars) {
        expect(star.locked).toBe(false);
      }
    });

    test("should parse guide lines correctly", () => {
      const state = starAlignmentHandler.init(mockPlayers, mockConfig);
      const lines = state.data.guideLines as { from: { row: number; col: number }; to: { row: number; col: number } }[];

      expect(lines.length).toBe(3);
      expect(lines[0].from).toEqual({ row: 2, col: 3 });
      expect(lines[0].to).toEqual({ row: 4, col: 5 });
    });
  });

  describe("handleAction — select_star", () => {
    test("should select a star", () => {
      const state = createState();
      const { state: newState, glitchDelta } = starAlignmentHandler.handleAction(
        state, "p1", "select_star", { starId: "g1" }
      );

      const selected = newState.data.selectedStarId as Record<string, string | null>;
      expect(selected.p1).toBe("g1");
      expect(glitchDelta).toBe(0);
    });

    test("should not select a locked star", () => {
      const state = createState();
      const stars = state.data.stars as any[];
      stars[0].locked = true;
      stars[0].lockUntil = Date.now() + 10000; // locked for 10 more seconds

      const { state: newState, glitchDelta } = starAlignmentHandler.handleAction(
        state, "p1", "select_star", { starId: "g1" }
      );

      const selected = newState.data.selectedStarId as Record<string, string | null>;
      expect(selected.p1).toBeUndefined();
      expect(glitchDelta).toBe(0);
    });

    test("should unlock an expired-lock star on selection", () => {
      const state = createState();
      const stars = state.data.stars as any[];
      stars[0].locked = true;
      stars[0].lockUntil = Date.now() - 1000; // lock expired

      const { state: newState } = starAlignmentHandler.handleAction(
        state, "p1", "select_star", { starId: "g1" }
      );

      const selected = newState.data.selectedStarId as Record<string, string | null>;
      expect(selected.p1).toBe("g1");
      const updatedStars = newState.data.stars as any[];
      expect(updatedStars[0].locked).toBe(false);
    });

    test("should ignore nonexistent star", () => {
      const state = createState();
      const { glitchDelta } = starAlignmentHandler.handleAction(
        state, "p1", "select_star", { starId: "nonexistent" }
      );
      expect(glitchDelta).toBe(0);
    });
  });

  describe("handleAction — place_star", () => {
    test("should place star at correct position with no penalty", () => {
      const state = createState();
      // Select g1 first
      const { state: s1 } = starAlignmentHandler.handleAction(
        state, "p1", "select_star", { starId: "g1" }
      );
      // Place at target (2,3)
      const { state: s2, glitchDelta } = starAlignmentHandler.handleAction(
        s1, "p1", "place_star", { row: 2, col: 3 }
      );

      const stars = s2.data.stars as { id: string; currentRow: number; currentCol: number; locked: boolean }[];
      const g1 = stars.find(s => s.id === "g1")!;
      expect(g1.currentRow).toBe(2);
      expect(g1.currentCol).toBe(3);
      expect(g1.locked).toBe(false);
      expect(glitchDelta).toBe(0);

      // Selection should be cleared
      const selected = s2.data.selectedStarId as Record<string, string | null>;
      expect(selected.p1).toBeNull();
    });

    test("should lock star and apply glitch for wrong placement", () => {
      const state = createState();
      const { state: s1 } = starAlignmentHandler.handleAction(
        state, "p1", "select_star", { starId: "g1" }
      );
      // Place at wrong position
      const { state: s2, glitchDelta } = starAlignmentHandler.handleAction(
        s1, "p1", "place_star", { row: 1, col: 1 }
      );

      const stars = s2.data.stars as { id: string; locked: boolean; currentRow: number; currentCol: number }[];
      const g1 = stars.find(s => s.id === "g1")!;
      expect(g1.currentRow).toBe(1);
      expect(g1.currentCol).toBe(1);
      expect(g1.locked).toBe(true);
      expect(glitchDelta).toBe(5);
      expect(s2.data.wrongPlacements).toBe(1);
    });

    test("should not place without selection", () => {
      const state = createState();
      const { state: newState, glitchDelta } = starAlignmentHandler.handleAction(
        state, "p1", "place_star", { row: 2, col: 3 }
      );
      expect(glitchDelta).toBe(0);
    });

    test("should not place out of bounds", () => {
      const state = createState();
      const { state: s1 } = starAlignmentHandler.handleAction(
        state, "p1", "select_star", { starId: "g1" }
      );
      const { state: s2, glitchDelta } = starAlignmentHandler.handleAction(
        s1, "p1", "place_star", { row: 99, col: 99 }
      );

      const stars = s2.data.stars as { id: string; currentRow: number }[];
      const g1 = stars.find(s => s.id === "g1")!;
      expect(g1.currentRow).toBe(0); // Unchanged
      expect(glitchDelta).toBe(0);
    });

    test("should not place on occupied cell", () => {
      const state = createState();
      // g2 is at (0,1). Try placing g1 on (0,1)
      const { state: s1 } = starAlignmentHandler.handleAction(
        state, "p1", "select_star", { starId: "g1" }
      );
      const { state: s2, glitchDelta } = starAlignmentHandler.handleAction(
        s1, "p1", "place_star", { row: 0, col: 1 }
      );

      const stars = s2.data.stars as { id: string; currentRow: number; currentCol: number }[];
      const g1 = stars.find(s => s.id === "g1")!;
      expect(g1.currentRow).toBe(0);
      expect(g1.currentCol).toBe(0); // Unchanged
      expect(glitchDelta).toBe(0);
    });

    test("should no-op when placing on same position", () => {
      const state = createState();
      const { state: s1 } = starAlignmentHandler.handleAction(
        state, "p1", "select_star", { starId: "g1" }
      );
      // g1 is at (0,0), place at (0,0) — same position
      const { state: s2, glitchDelta } = starAlignmentHandler.handleAction(
        s1, "p1", "place_star", { row: 0, col: 0 }
      );
      expect(glitchDelta).toBe(0);
      // Selection should be cleared
      const selected = s2.data.selectedStarId as Record<string, string | null>;
      expect(selected.p1).toBeNull();
    });
  });

  describe("handleAction — deselect_star", () => {
    test("should clear selection", () => {
      const state = createState();
      const { state: s1 } = starAlignmentHandler.handleAction(
        state, "p1", "select_star", { starId: "g1" }
      );
      const { state: s2 } = starAlignmentHandler.handleAction(
        s1, "p1", "deselect_star", {}
      );

      const selected = s2.data.selectedStarId as Record<string, string | null>;
      expect(selected.p1).toBeNull();
    });
  });

  describe("checkWin", () => {
    test("should return false when stars are not all at targets", () => {
      const state = createState();
      expect(starAlignmentHandler.checkWin(state)).toBe(false);
    });

    test("should return true when all stars at target positions", () => {
      const state = createState();
      const stars = state.data.stars as any[];
      for (const star of stars) {
        star.currentRow = star.targetRow;
        star.currentCol = star.targetCol;
      }
      expect(starAlignmentHandler.checkWin(state)).toBe(true);
    });
  });

  describe("getPlayerView", () => {
    test("Astronomer should see all guide lines", () => {
      const state = createState();
      const view = starAlignmentHandler.getPlayerView(state, "p1", "Αστρονόμος", mockConfig);

      expect(view.role).toBe("Αστρονόμος");
      const lines = view.viewData.guideLines as any[];
      expect(lines.length).toBe(3); // All 3 lines visible
      expect(view.viewData.canMoveColors).toEqual(["gold"]);
    });

    test("Navigator should see only guide lines touching blue star targets", () => {
      const state = createState();
      const view = starAlignmentHandler.getPlayerView(state, "p2", "Πλοηγός", mockConfig);

      expect(view.role).toBe("Πλοηγός");
      expect(view.viewData.canMoveColors).toEqual(["blue"]);

      // Blue targets: b1 at (1,4), b2 at (3,1)
      // Lines: (2,3)→(4,5) [no blue target], (1,4)→(3,1) [both blue], (2,3)→(1,4) [one blue]
      const lines = view.viewData.guideLines as any[];
      expect(lines.length).toBe(2); // Only lines touching blue targets
    });

    test("should show all stars for both roles", () => {
      const state = createState();

      const astroView = starAlignmentHandler.getPlayerView(state, "p1", "Αστρονόμος", mockConfig);
      const navView = starAlignmentHandler.getPlayerView(state, "p2", "Πλοηγός", mockConfig);

      const astroStars = astroView.viewData.stars as any[];
      const navStars = navView.viewData.stars as any[];

      expect(astroStars.length).toBe(4);
      expect(navStars.length).toBe(4);
    });

    test("should show correct=true for stars at target position", () => {
      const state = createState();
      const stars = state.data.stars as any[];
      stars[0].currentRow = stars[0].targetRow;
      stars[0].currentCol = stars[0].targetCol;

      const view = starAlignmentHandler.getPlayerView(state, "p1", "Αστρονόμος", mockConfig);
      const viewStars = view.viewData.stars as { id: string; correct: boolean }[];
      const g1 = viewStars.find(s => s.id === "g1")!;
      expect(g1.correct).toBe(true);
    });

    test("should not expose target positions in player view", () => {
      const state = createState();
      const view = starAlignmentHandler.getPlayerView(state, "p1", "Αστρονόμος", mockConfig);

      const viewStars = view.viewData.stars as Record<string, unknown>[];
      for (const star of viewStars) {
        expect(star.targetRow).toBeUndefined();
        expect(star.targetCol).toBeUndefined();
      }
    });

    test("should show selected star id per player", () => {
      const state = createState();
      (state.data as any).selectedStarId = { p1: "g1", p2: null };

      const view1 = starAlignmentHandler.getPlayerView(state, "p1", "Αστρονόμος", mockConfig);
      const view2 = starAlignmentHandler.getPlayerView(state, "p2", "Πλοηγός", mockConfig);

      expect(view1.viewData.selectedStarId).toBe("g1");
      expect(view2.viewData.selectedStarId).toBeNull();
    });
  });
});
