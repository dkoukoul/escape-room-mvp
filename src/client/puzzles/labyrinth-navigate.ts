// ============================================================
// Client Renderer: Labyrinth Navigate — The Labyrinth of Daedalus
// ============================================================

import { h, $, mount, clear } from "../lib/dom.ts";
import { emit, ClientEvents } from "../lib/socket.ts";
import { playSuccess, playFail } from "../audio/audio-manager.ts";
import type { PlayerView } from "@shared/types.ts";

// Cell type constants (match server)
const FLOOR = 0;
const WALL = 1;
const TRAP = 2;
const EXIT = 3;
const LANDMARK = 4;
const FOG = -1;

export function renderLabyrinthNavigate(container: HTMLElement, view: PlayerView): void {
  mount(
    container,
    h("div", { className: "puzzle-header" },
      h("h2", { className: "title-lg" }, view.puzzleTitle),
      h("div", { className: "puzzle-role-badge" }, view.role),
    ),
  );

  const inner = h("div", { className: "labyrinth-inner mt-lg w-full flex-col items-center" });
  mount(container, inner);

  if (view.role === "Χαρτογράφος") {
    renderCartographerView(inner, view);
  } else {
    renderRunnerView(inner, view);
  }
}

function renderCartographerView(container: HTMLElement, view: PlayerView): void {
  const data = view.viewData as Record<string, unknown>;
  const grid = data.grid as number[][];
  const rows = data.rows as number;
  const cols = data.cols as number;
  const landmarks = data.landmarks as { row: number; col: number; label: string }[];
  const pings = data.pings as { row: number; col: number }[];
  const exitPos = data.exitPosition as { row: number; col: number };

  mount(container,
    h("p", { className: "subtitle mb-md" }, "Καθοδήγησε τον Δρομέα στην έξοδο!"),
  );

  const gridEl = h("div", {
    className: "labyrinth-grid",
    style: `grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr);`,
  });

  // Build ping lookup
  const pingSet = new Set(pings.map((p) => `${p.row},${p.col}`));
  // Build landmark lookup
  const landmarkMap = new Map(landmarks.map((l) => [`${l.row},${l.col}`, l.label]));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellValue = grid[r]?.[c] ?? FLOOR;
      const key = `${r},${c}`;
      let className = "lab-cell";
      let content = "";

      switch (cellValue) {
        case WALL: className += " wall"; break;
        case TRAP: className += " trap"; break;
        case EXIT: className += " exit"; content = "⬡"; break;
        case LANDMARK: className += " landmark"; break;
        default: className += " floor"; break;
      }

      // Check for landmark label
      const label = landmarkMap.get(key);
      if (label) {
        className += " landmark";
        content = label;
      }

      // Exit position override
      if (r === exitPos.row && c === exitPos.col) {
        className += " exit";
        content = "⬡";
      }

      const cellChildren: (HTMLElement | string)[] = [];
      if (content) cellChildren.push(content);

      // Ping indicator
      if (pingSet.has(key)) {
        cellChildren.push(h("div", { className: "lab-ping" }));
      }

      gridEl.appendChild(h("div", { className }, ...cellChildren));
    }
  }

  mount(container, gridEl);
}

function renderRunnerView(container: HTMLElement, view: PlayerView): void {
  const data = view.viewData as Record<string, unknown>;
  const localGrid = data.localGrid as number[][];
  const position = data.position as { row: number; col: number };
  const visRadius = data.visibilityRadius as number;
  const nearbyLandmarks = data.nearbyLandmarks as { row: number; col: number; label: string }[];
  const totalRows = data.rows as number;
  const totalCols = data.cols as number;
  const puzzleId = view.puzzleId;

  const gridSize = visRadius * 2 + 1;

  // Position indicator
  mount(container,
    h("p", { id: "lab-position", className: "subtitle mb-md" },
      `Θέση: [${position.row}, ${position.col}] — Λαβύρινθος: ${totalRows}×${totalCols}`
    ),
  );

  // Local grid
  const gridEl = h("div", {
    className: "labyrinth-grid labyrinth-grid-local",
    style: `grid-template-columns: repeat(${gridSize}, 1fr); grid-template-rows: repeat(${gridSize}, 1fr);`,
  });

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cellValue = localGrid[r]?.[c] ?? FOG;
      let className = "lab-cell";
      let content = "";

      // Center cell is the runner
      const isRunner = r === visRadius && c === visRadius;

      if (cellValue === FOG) {
        className += " fog";
      } else {
        switch (cellValue) {
          case WALL: className += " wall"; break;
          case TRAP: className += " floor"; break; // Traps look like floor to runner
          case EXIT: className += " exit"; content = "⬡"; break;
          case LANDMARK: className += " landmark"; break;
          default: className += " floor"; break;
        }
      }

      const cellChildren: (HTMLElement | string)[] = [];
      if (isRunner) {
        cellChildren.push(h("div", { className: "lab-runner" }));
      }
      if (content) cellChildren.push(content);

      // Check for nearby landmarks at this position
      const worldRow = position.row - visRadius + r;
      const worldCol = position.col - visRadius + c;
      const lm = nearbyLandmarks.find((l) => l.row === worldRow && l.col === worldCol);
      if (lm) {
        cellChildren.push(h("span", { className: "lab-landmark-label" }, lm.label));
      }

      gridEl.appendChild(h("div", { className }, ...cellChildren));
    }
  }

  mount(container, gridEl);

  // D-pad controls
  const emitMove = (direction: string) => {
    emit(ClientEvents.PUZZLE_ACTION, {
      puzzleId,
      action: "move",
      data: { direction },
    });
  };

  const controls = h("div", { className: "lab-controls mt-lg" },
    h("div", null), // top-left spacer
    h("button", { className: "lab-btn", onClick: () => emitMove("up") }, "↑"),
    h("div", null), // top-right spacer
    h("button", { className: "lab-btn", onClick: () => emitMove("left") }, "←"),
    h("button", { className: "lab-btn lab-ping-btn", onClick: () => {
      emit(ClientEvents.PUZZLE_ACTION, { puzzleId, action: "ping", data: {} });
    }}, "📡"),
    h("button", { className: "lab-btn", onClick: () => emitMove("right") }, "→"),
    h("div", null), // bottom-left spacer
    h("button", { className: "lab-btn", onClick: () => emitMove("down") }, "↓"),
    h("div", null), // bottom-right spacer
  );

  mount(container, controls);

  // Nearby landmarks text
  if (nearbyLandmarks.length > 0) {
    const lmText = nearbyLandmarks.map((l) => l.label).join(", ");
    mount(container,
      h("p", { id: "lab-landmarks", className: "subtitle mt-md" }, `Κοντινά σημεία: ${lmText}`),
    );
  }
}

export function updateLabyrinthNavigate(view: PlayerView): void {
  // Full re-render of inner container
  const container = $(".labyrinth-inner");
  if (!container) return;

  clear(container);

  if (view.role === "Χαρτογράφος") {
    renderCartographerView(container, view);
  } else {
    renderRunnerView(container, view);
  }
}
