// ============================================================
// Client: Collaborative Assembly — Drag and drop grid
// ============================================================

import { h, $, $$, mount, clear } from "../lib/dom.ts";
import { emit, ClientEvents } from "../lib/socket.ts";
import { playSuccess, playGlitchHit } from "../audio/audio-manager.ts";
import type { PlayerView } from "@shared/types.ts";

let currentDragPieceId: number | null = null;

function showRotationIndicator(container: HTMLElement): void {
  const indicator = document.createElement("div");
  indicator.className = "rotation-indicator";
  indicator.textContent = "+90°";

  container.appendChild(indicator);

  setTimeout(() => {
    indicator.remove();
  }, 600);
}

export function renderCollaborativeAssembly(container: HTMLElement, view: PlayerView): void {
  const data = view.viewData as Record<string, unknown>;
  const gridCols = data.gridCols as number;
  const gridRows = data.gridRows as number;
  const totalPieces = data.totalPieces as number;
  const placedCorrectly = data.placedCorrectly as number;
  const isArchitect = !!data.blueprint;

  if (isArchitect) {
    const blueprint = data.blueprint as { id: number; col: number; row: number; rotation: number }[];
    const cells: HTMLElement[] = [];
    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            const bp = blueprint.find(p => p.col === col && p.row === row);
            cells.push(
                h("div", { className: "blueprint-cell" },
                    ...(bp ? [
                        h("span", { className: "blueprint-id" }, `#${bp.id + 1}`),
                        h("span", { className: "blueprint-rotation" }, `${bp.rotation}°`)
                    ] : [])
                )
            );
        }
    }

    mount(
      container,
      h("div", { className: "puzzle-header" },
        h("h2", { className: "title-lg" }, "The Parthenon Reconstruction"),
        h("div", { className: "puzzle-role-badge" }, view.role),
      ),
      h("p", { className: "subtitle mt-md" }, "Guide your team! Tell them which ID goes where and at what rotation."),
      h("p", { id: "assembly-progress", className: "subtitle mt-sm" },
        `Placed: ${placedCorrectly} / ${totalPieces}`),
      h("div", {
        className: "assembly-blueprint mt-lg",
        style: `grid-template-columns: repeat(${gridCols}, 1fr); grid-template-rows: repeat(${gridRows}, 1fr);`,
      }, ...cells)
    );
    return;
  }

  // Builder View
  const myPieces = data.myPieces as { id: number; label: string; rotation: number }[];
  const placedPieces = data.placedPieces as { id: number; col: number; row: number; rotation: number }[];

  const gridCells: HTMLElement[] = [];
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const placed = placedPieces.find((p) => p.col === col && p.row === row);
      const cell = h("div", {
        className: `assembly-cell ${placed ? "filled" : "drop-target"}`,
        id: `cell-${row}-${col}`,
        "data-row": row,
        "data-col": col,
        onDragover: (e: Event) => (e as DragEvent).preventDefault(),
        onDrop: (e: Event) => handleDrop(e as DragEvent, row, col, view.puzzleId),
      }, placed ? h("div", { 
          className: 'assembly-piece',
          style: `transform: rotate(${placed.rotation}deg); width: 100%; height: 100%; pointer-events: none;`
      }, `#${placed.id + 1}`) : "");
      gridCells.push(cell);
    }
  }

  mount(
    container,
    h("div", { className: "puzzle-header" },
      h("h2", { className: "title-lg" }, "The Parthenon Reconstruction"),
      h("div", { className: "puzzle-role-badge" }, view.role),
    ),
    h("p", { className: "subtitle mt-md" }, "Coach with the Architect to find the correct assembly!"),
    h("p", { id: "assembly-progress", className: "subtitle mt-sm" },
      `Placed: ${placedCorrectly} / ${totalPieces}`),

    // Grid
    h("div", {
      className: "assembly-grid mt-lg",
      style: `grid-template-columns: repeat(${gridCols}, 1fr); grid-template-rows: repeat(${gridRows}, 1fr);`,
    }, ...gridCells),

    // My pieces tray
    h("div", { className: "mt-lg" },
      h("p", { className: "hud-label text-center" }, "YOUR FRAGMENTS"),
      h("div", { id: "piece-tray", className: "assembly-piece-tray mt-sm" },
        ...myPieces.map((piece) =>
          h("div", { className: "assembly-piece-container" },
              h("div", {
                className: 'assembly-piece',
                style: `transform: rotate(${piece.rotation}deg);`,
                draggable: "true",
                id: `piece-${piece.id}`,
                "data-piece-id": piece.id,
                onDragstart: (e: Event) => handleDragStart(e as DragEvent, piece.id),
              }, piece.label),
              h("button", {
                  className: "btn-rotate mt-xs",
                  onclick: (e: Event) => {
                      const container = (e.currentTarget as HTMLElement)
                        .closest(".assembly-piece-container") as HTMLElement;

                      const pieceDiv = container.querySelector(".assembly-piece") as HTMLElement;

                      // Get current rotation from dataset (fallback 0)
                      const current = Number(pieceDiv.dataset.localRotation ?? "0");
                      const next = (current + 90) % 360;

                      pieceDiv.dataset.localRotation = String(next);
                      pieceDiv.style.transform = `rotate(${next}deg)`;

                      showRotationIndicator(container);

                      emit(ClientEvents.PUZZLE_ACTION, {
                        puzzleId: view.puzzleId,
                        action: "rotate_piece",
                        data: { pieceId: piece.id }
                      });
                    }
                }, "Rotate")
          )
        ),
        myPieces.length === 0
          ? h("p", { className: "subtitle" }, "All your pieces are placed!")
          : null,
      ),
    ),
  );
}

function handleDragStart(e: DragEvent, pieceId: number): void {
  currentDragPieceId = pieceId;
  e.dataTransfer?.setData("text/plain", String(pieceId));
}

function handleDrop(e: DragEvent, row: number, col: number, puzzleId: string): void {
  e.preventDefault();
  const pieceId = currentDragPieceId;
  if (pieceId === null) return;

  emit(ClientEvents.PUZZLE_ACTION, {
    puzzleId,
    action: "place_piece",
    data: { pieceId, col, row },
  });

  currentDragPieceId = null;
}

export function updateCollaborativeAssembly(view: PlayerView): void {
  const data = view.viewData as Record<string, unknown>;
  if (view.puzzleType === "collaborative_assembly") {
    const container = $("#screen-puzzle") as HTMLElement;
    renderCollaborativeAssembly(container, view);
  }

  if (data.placedCorrectly === data.totalPieces) {
    playSuccess();
  }
}
