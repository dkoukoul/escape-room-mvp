// ============================================================
// Router — Simple screen manager
// ============================================================

import type { GlitchState } from "@shared/types.ts";
import { $ } from "./dom.ts";
import { startRandomFX, stopRandomFX } from "./visual-fx.ts";

export type ScreenName = "lobby" | "level-intro" | "briefing" | "puzzle" | "results";

let currentScreen: ScreenName = "lobby";

/**
 * Show a screen and hide all others
 */
export function showScreen(name: ScreenName, glitch: GlitchState): void {
  console.log(`[Router] Glitch: ${JSON.stringify(glitch)}`);
  // Hide current
  const current = $(`#screen-${currentScreen}`);
  if (current) current.classList.remove("active");

  // Show target
  const target = $(`#screen-${name}`);
  if (target) target.classList.add("active");

  currentScreen = name;
  console.log(`[Router] Screen: ${name}`);

  // Manage Visual FX: only during missions (puzzles)
  if (name === "puzzle" && glitch) {
    const glitchName = Array.isArray(glitch) 
      ? glitch.find((g: any) => g.name)?.name || "matrix-glitch"
      : (glitch as any).name || "matrix-glitch";
    console.log(`[Router] Starting random FX for glitch: ${glitchName}`);
    startRandomFX([glitchName]);
  } else {
    stopRandomFX();
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
