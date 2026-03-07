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
import { renderAlphabetWall, updateAlphabetWall } from "../puzzles/alphabet-wall.ts";
import { renderDemogorgonHunt, updateDemogorgonHunt } from "../puzzles/demogorgon-hunt.ts";
import { renderLabyrinthNavigate, updateLabyrinthNavigate } from "../puzzles/labyrinth-navigate.ts";
import { renderEchoRelay, updateEchoRelay } from "../puzzles/echo-relay.ts";
import { renderStarAlignment, updateStarAlignment } from "../puzzles/star-alignment.ts";
import logger from "@client/logger.ts";

let currentPuzzleType: string | null = null;

export function initPuzzleScreen(): void {
  on(ServerEvents.PUZZLE_START, (data: PuzzleStartPayload) => {
    logger.info("[Puzzle] Starting puzzle: with data", JSON.stringify(data));
    showScreen("puzzle", data.glitch);
    currentPuzzleType = data.puzzleType;
    renderPuzzle(data);
  });

  on(ServerEvents.PUZZLE_UPDATE, (data: PuzzleUpdatePayload) => {
    updatePuzzle(data.playerView);
  });
}

function renderPuzzle(data: PuzzleStartPayload): void {
  logger.info(`[Puzzle] Rendering puzzle: ${data.puzzleTitle}`);
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
    case "alphabet_wall":
      renderAlphabetWall(container, data.playerView);
      break;
    case "demogorgon_hunt":
      renderDemogorgonHunt(container, data.playerView);
      break;
    case "labyrinth_navigate":
      renderLabyrinthNavigate(container, data.playerView);
      break;
    case "echo_relay":
      renderEchoRelay(container, data.playerView);
      break;
    case "star_alignment":
      renderStarAlignment(container, data.playerView);
      break;
    default:
      mount(container, h("p", { className: "subtitle" }, `Unknown puzzle type: ${data.puzzleType}`));
  }
}

function updatePuzzle(view: PlayerView): void {
  logger.info(`[Puzzle] Updating puzzle: ${currentPuzzleType}`);
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
    case "alphabet_wall":
      updateAlphabetWall(view);
      break;
    case "demogorgon_hunt":
      updateDemogorgonHunt(view);
      break;
    case "labyrinth_navigate":
      updateLabyrinthNavigate(view);
      break;
    case "echo_relay":
      updateEchoRelay(view);
      break;
    case "star_alignment":
      updateStarAlignment(view);
      break;
  }
}
