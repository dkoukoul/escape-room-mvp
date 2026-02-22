// ============================================================
// Router — Simple screen manager
// ============================================================

import { $ } from "./dom.ts";
import { startMatrixGlitches, stopMatrixGlitches } from "./visual-fx.ts";

export type ScreenName = "lobby" | "level-intro" | "briefing" | "puzzle" | "results";

let currentScreen: ScreenName = "lobby";

/**
 * Show a screen and hide all others
 */
export function showScreen(name: ScreenName): void {
  // Hide current
  const current = $(`#screen-${currentScreen}`);
  if (current) current.classList.remove("active");

  // Show target
  const target = $(`#screen-${name}`);
  if (target) target.classList.add("active");

  currentScreen = name;
  console.log(`[Router] Screen: ${name}`);

  // Manage Matrix glitches: only during missions (puzzles)
  if (name === "puzzle") {
    startMatrixGlitches();
  } else {
    stopMatrixGlitches();
  }
}

/**
 * Get the current screen name
 */
export function getCurrentScreen(): ScreenName {
  return currentScreen;
}

/**
 * Show/hide the HUD
 */
export function showHUD(visible: boolean): void {
  const hud = $("#hud");
  if (hud) {
    hud.classList.toggle("hidden", !visible);
  }
}
