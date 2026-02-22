// ============================================================
// Client: Collaborative Assembly — Drag and drop grid
// ============================================================

import { h, $, $$, mount, clear } from "../lib/dom.ts";
import { emit, ClientEvents } from "../lib/socket.ts";
import { playSuccess, playGlitchHit } from "../audio/audio-manager.ts";
import type { PlayerView } from "@shared/types.ts";

let currentDragPieceId: number | null = null;

export function renderCollaborativeAssembly(container: HTMLElement, view: PlayerView): void {
  const data = view.viewData as Record<string, unknown>;
  const gridCols = data.gridCols as number;
  const gridRows = data.gridRows as number;
  const myPieces = data.myPieces as { id: number; label: string }[];
  const placedPieces = data.placedPieces as { id: number; col: number; row: number }[];
  const totalPieces = data.totalPieces as number;
  const placedCorrectly = data.placedCorrectly as number;

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
        onDrop: (e: Event) => handleDrop(e as DragEvent, row, col),
      }, placed ? `#${placed.id + 1}` : "");
      gridCells.push(cell);
    }
  }

  mount(
    container,
    h("div", { className: "puzzle-header" },
      h("h2", { className: "title-lg" }, "The Parthenon Reconstruction"),
      h("div", { className: "puzzle-role-badge" }, "Builder"),
    ),
    h("p", { className: "subtitle mt-md" }, "Drag your pieces to the correct positions!"),
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
          h("div", {
            className: "assembly-piece",
            draggable: "true",
            id: `piece-${piece.id}`,
            "data-piece-id": piece.id,
            onDragstart: (e: Event) => handleDragStart(e as DragEvent, piece.id),
          }, piece.label)
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

function handleDrop(e: DragEvent, row: number, col: number): void {
  e.preventDefault();
  const pieceId = currentDragPieceId;
  if (pieceId === null) return;

  emit(ClientEvents.PUZZLE_ACTION, {
    puzzleId: "",
    action: "place_piece",
    data: { pieceId, col, row },
  });

  currentDragPieceId = null;
}

export function updateCollaborativeAssembly(view: PlayerView): void {
  const data = view.viewData as Record<string, unknown>;
  const placedPieces = data.placedPieces as { id: number; col: number; row: number }[];
  const placedCorrectly = data.placedCorrectly as number;
  const totalPieces = data.totalPieces as number;
  const myPieces = data.myPieces as { id: number; label: string }[];

  // Update progress
  const progressEl = $("#assembly-progress");
  if (progressEl) progressEl.textContent = `Placed: ${placedCorrectly} / ${totalPieces}`;

  // Update grid cells
  const cells = $$(".assembly-cell");
  cells.forEach((cell) => {
    const row = parseInt(cell.dataset.row ?? "0");
    const col = parseInt(cell.dataset.col ?? "0");
    const placed = placedPieces.find((p) => p.col === col && p.row === row);
    if (placed) {
      cell.classList.add("filled");
      cell.classList.remove("drop-target");
      cell.textContent = `#${placed.id + 1}`;
    }
  });

  // Update piece tray
  const tray = $("#piece-tray");
  if (tray) {
    clear(tray);
    if (myPieces.length === 0) {
      tray.appendChild(h("p", { className: "subtitle" }, "All your pieces are placed!"));
    } else {
      myPieces.forEach((piece) => {
        tray.appendChild(
          h("div", {
            className: "assembly-piece",
            draggable: "true",
            id: `piece-${piece.id}`,
            "data-piece-id": piece.id,
            onDragstart: (e: Event) => handleDragStart(e as DragEvent, piece.id),
          }, piece.label)
        );
      });
    }
  }

  if (placedCorrectly === totalPieces) {
    playSuccess();
  }
}
