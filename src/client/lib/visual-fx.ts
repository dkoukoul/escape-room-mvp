// ============================================================
// Visual FX — Random glitch effects for missions
// ============================================================

import { $ } from "./dom.ts";

let glitchTimeout: ReturnType<typeof setTimeout> | null = null;
let isActive = false;

/**
 * Start the random matrix glitch cycle
 */
export function startMatrixGlitches(): void {
  if (isActive) return;
  isActive = true;
  scheduleNextGlitch();
  console.log("⚡ VisualFX: Matrix glitch cycle started.");
}

/**
 * Stop the random matrix glitch cycle
 */
export function stopMatrixGlitches(): void {
  isActive = false;
  if (glitchTimeout) {
    clearTimeout(glitchTimeout);
    glitchTimeout = null;
  }
  const app = $("#app");
  if (app) {
    app.classList.remove("matrix-glitch-active");
  }
  console.log("⚡ VisualFX: Matrix glitch cycle stopped.");
}

function scheduleNextGlitch(): void {
  if (!isActive) return;

  // Random delay between 3s and 10s for the next glitch to appear
  const delay = Math.random() * 7000 + 3000;
  
  glitchTimeout = setTimeout(() => {
    triggerGlitch();
  }, delay);
}

function triggerGlitch(): void {
  if (!isActive) return;

  const app = $("#app");
  if (!app) return;

  // Random duration between 500ms and 2000ms
  const duration = Math.random() * 1500 + 500;

  app.classList.add("matrix-glitch-active");

  setTimeout(() => {
    app.classList.remove("matrix-glitch-active");
    scheduleNextGlitch();
  }, duration);
}
