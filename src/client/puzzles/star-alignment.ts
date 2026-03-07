// ============================================================
// Client Renderer: Star Alignment — The Constellation Map
// ============================================================

import { h, $, mount, clear } from "../lib/dom.ts";
import { emit, ClientEvents } from "../lib/socket.ts";
import { playSuccess, playFail } from "../audio/audio-manager.ts";
import type { PlayerView } from "@shared/types.ts";

interface StarView {
  id: string;
  color: "gold" | "blue";
  currentRow: number;
  currentCol: number;
  locked: boolean;
  correct: boolean;
}

interface GuideLineView {
  from: { row: number; col: number };
  to: { row: number; col: number };
}

export function renderStarAlignment(container: HTMLElement, view: PlayerView): void {
  mount(
    container,
    h("div", { className: "puzzle-header" },
      h("h2", { className: "title-lg" }, view.puzzleTitle),
      h("div", { className: "puzzle-role-badge" }, view.role),
    ),
  );

  const inner = h("div", { className: "star-inner mt-lg w-full flex-col items-center" });
  mount(container, inner);

  renderStarView(inner, view);
}

function renderStarView(container: HTMLElement, view: PlayerView): void {
  const data = view.viewData as Record<string, unknown>;
  const gridRows = data.gridRows as number;
  const gridCols = data.gridCols as number;
  const stars = data.stars as StarView[];
  const guideLines = data.guideLines as GuideLineView[];
  const selectedStarId = data.selectedStarId as string | null;
  const canMoveColors = data.canMoveColors as string[];
  const wrongPlacements = data.wrongPlacements as number;
  const puzzleId = view.puzzleId;

  // Role-specific instruction
  const instruction = view.role === "Αστρονόμος"
    ? "Βλέπεις ολόκληρο τον αστερισμό. Μετακίνησε τα χρυσά αστέρια!"
    : "Βλέπεις μόνο τα μπλε σημεία. Μετακίνησε τα μπλε αστέρια!";

  mount(container,
    h("p", { className: "subtitle mb-md" }, instruction),
  );

  // Progress
  const correctCount = stars.filter((s) => s.correct).length;
  mount(container,
    h("p", { id: "star-progress", className: "subtitle mb-sm" },
      `Αστέρια στη θέση: ${correctCount} / ${stars.length}`
    ),
  );

  // Grid wrapper (relative positioning for SVG overlay)
  const gridWrapper = h("div", { className: "star-grid-wrapper" });

  // Build star position lookup
  const starMap = new Map<string, StarView>();
  for (const star of stars) {
    starMap.set(`${star.currentRow},${star.currentCol}`, star);
  }

  // Grid
  const gridEl = h("div", {
    className: "star-grid",
    style: `grid-template-columns: repeat(${gridCols}, 1fr); grid-template-rows: repeat(${gridRows}, 1fr);`,
  });

  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const key = `${r},${c}`;
      const star = starMap.get(key);

      const cellChildren: (HTMLElement | string)[] = [];

      if (star) {
        let starClass = `star-icon star-${star.color}`;
        if (star.locked) starClass += " locked";
        if (star.correct) starClass += " correct";
        if (selectedStarId === star.id) starClass += " selected";

        const canMove = canMoveColors.includes(star.color);

        const starAttrs: Record<string, unknown> = { className: starClass };
        if (canMove) {
          starAttrs.onClick = () => {
            if (selectedStarId === star.id) {
              emit(ClientEvents.PUZZLE_ACTION, {
                puzzleId,
                action: "deselect_star",
                data: {},
              });
            } else {
              emit(ClientEvents.PUZZLE_ACTION, {
                puzzleId,
                action: "select_star",
                data: { starId: star.id },
              });
            }
          };
        }

        cellChildren.push(h("div", starAttrs as any));
      }

      const cellClass = star ? "star-cell has-star" : "star-cell";
      const cellAttrs: Record<string, unknown> = { className: cellClass };

      if (!star && selectedStarId) {
        cellAttrs.onClick = () => {
          emit(ClientEvents.PUZZLE_ACTION, {
            puzzleId,
            action: "place_star",
            data: { row: r, col: c },
          });
        };
      }

      gridEl.appendChild(
        h("div", cellAttrs as any, ...cellChildren)
      );
    }
  }

  gridWrapper.appendChild(gridEl);

  // SVG overlay for guide lines
  if (guideLines.length > 0) {
    const svgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNs, "svg");
    svg.setAttribute("class", "star-guide-svg");
    svg.setAttribute("viewBox", `0 0 ${gridCols} ${gridRows}`);
    svg.setAttribute("preserveAspectRatio", "none");

    for (const line of guideLines) {
      const lineEl = document.createElementNS(svgNs, "line");
      // Center of each cell
      lineEl.setAttribute("x1", String(line.from.col + 0.5));
      lineEl.setAttribute("y1", String(line.from.row + 0.5));
      lineEl.setAttribute("x2", String(line.to.col + 0.5));
      lineEl.setAttribute("y2", String(line.to.row + 0.5));

      // Color based on role
      const lineColor = view.role === "Αστρονόμος" ? "var(--neon-gold)" : "#4488ff";
      lineEl.setAttribute("stroke", lineColor);
      lineEl.setAttribute("stroke-width", "0.08");
      lineEl.setAttribute("stroke-dasharray", "0.15 0.1");
      lineEl.setAttribute("opacity", "0.5");

      svg.appendChild(lineEl);
    }

    gridWrapper.appendChild(svg);
  }

  mount(container, gridWrapper);

  // Selection hint
  if (selectedStarId) {
    mount(container,
      h("p", { className: "subtitle mt-sm star-selection-hint" },
        "Κάνε κλικ σε ένα κελί για να τοποθετήσεις το αστέρι"
      ),
    );
  }

  // Wrong placements
  if (wrongPlacements > 0) {
    mount(container,
      h("p", { id: "star-wrong", className: "text-error mt-sm" },
        `Λανθασμένες τοποθετήσεις: ${wrongPlacements}`
      ),
    );
  }
}

export function updateStarAlignment(view: PlayerView): void {
  const container = $(".star-inner");
  if (!container) return;

  clear(container);
  renderStarView(container, view);
}
