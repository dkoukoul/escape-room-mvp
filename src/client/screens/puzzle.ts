// ============================================================
// Puzzle Screen — Container that loads the correct puzzle renderer
// ============================================================

import { h, $, mount, clear } from "../lib/dom.ts";
import { on, ServerEvents } from "../lib/socket.ts";
import { showScreen } from "../lib/router.ts";
import type { PuzzleStartPayload, PuzzleUpdatePayload } from "@shared/events.ts";
import type { PlayerView } from "@shared/types.ts";

// Puzzle renderers
import { renderAsymmetricSymbols, updateAsymmetricSymbols } from "../puzzles/asymmetric-symbols.ts";
import { renderRhythmTap, updateRhythmTap } from "../puzzles/rhythm-tap.ts";
import { renderCollaborativeWiring, updateCollaborativeWiring } from "../puzzles/collaborative-wiring.ts";
import { renderCipherDecode, updateCipherDecode } from "../puzzles/cipher-decode.ts";
import { renderCollaborativeAssembly, updateCollaborativeAssembly } from "../puzzles/collaborative-assembly.ts";

let currentPuzzleType: string | null = null;

export function initPuzzleScreen(): void {
  on(ServerEvents.PUZZLE_START, (data: PuzzleStartPayload) => {
    showScreen("puzzle");
    currentPuzzleType = data.puzzleType;
    renderPuzzle(data);
  });

  on(ServerEvents.PUZZLE_UPDATE, (data: PuzzleUpdatePayload) => {
    updatePuzzle(data.playerView);
  });
}

function renderPuzzle(data: PuzzleStartPayload): void {
  const screen = $("#screen-puzzle")!;
  clear(screen);

  const container = h("div", { className: "puzzle-container fade-in" });
  mount(screen, container);

  // Update HUD role
  const roleEl = $("#hud-role-value");
  if (roleEl) roleEl.textContent = data.playerView.role;

  switch (data.puzzleType) {
    case "asymmetric_symbols":
      renderAsymmetricSymbols(container, data.playerView, data.roles);
      break;
    case "rhythm_tap":
      renderRhythmTap(container, data.playerView);
      break;
    case "collaborative_wiring":
      renderCollaborativeWiring(container, data.playerView);
      break;
    case "cipher_decode":
      renderCipherDecode(container, data.playerView);
      break;
    case "collaborative_assembly":
      renderCollaborativeAssembly(container, data.playerView);
      break;
    default:
      mount(container, h("p", { className: "subtitle" }, `Unknown puzzle type: ${data.puzzleType}`));
  }
}

function updatePuzzle(view: PlayerView): void {
  switch (currentPuzzleType) {
    case "asymmetric_symbols":
      updateAsymmetricSymbols(view);
      break;
    case "rhythm_tap":
      updateRhythmTap(view);
      break;
    case "collaborative_wiring":
      updateCollaborativeWiring(view);
      break;
    case "cipher_decode":
      updateCipherDecode(view);
      break;
    case "collaborative_assembly":
      updateCollaborativeAssembly(view);
      break;
  }
}
