// ============================================================
// Visual FX — Random glitch effects for missions
// ============================================================

import { $ } from "./dom.ts";
import { playGlitchHit } from "../audio/audio-manager.ts";

export type FXHandler = (duration: number) => void;

const fxRegistry = new Map<string, FXHandler>();
let randomCycleTimeout: ReturnType<typeof setTimeout> | null = null;
let activePool: string[] = [];
let isCycleActive = false;

/**
 * Register a new visual effect
 */
export function registerFX(id: string, handler: FXHandler): void {
  fxRegistry.set(id, handler);
}

/**
 * Trigger a specific effect by ID
 */
export function triggerFX(id: string, duration?: number): void {
  const handler = fxRegistry.get(id);
  if (!handler) {
    console.warn(`[VisualFX] Effect not found: ${id}`);
    return;
  }
  
  const finalDuration = duration ?? (Math.random() * 1500 + 500);
  handler(finalDuration);
}

/**
 * Start a random cycle of effects from a given pool
 */
export function startRandomFX(effectIds: string[]): void {
  if (isCycleActive) stopRandomFX();
  
  activePool = effectIds;
  isCycleActive = true;
  scheduleNextFX();
  console.log(`[VisualFX] Random cycle started with pool: ${effectIds.join(", ")}`);
}

/**
 * Stop the random effects cycle
 */
export function stopRandomFX(): void {
  isCycleActive = false;
  if (randomCycleTimeout) {
    clearTimeout(randomCycleTimeout);
    randomCycleTimeout = null;
  }
  const app = $("#app");
  if (app) {
    app.classList.remove("matrix-glitch-active");
  }
  console.log("[VisualFX] Random cycle stopped.");
}

function scheduleNextFX(): void {
  if (!isCycleActive || activePool.length === 0) return;

  const delay = Math.random() * 7000 + 3000;
  randomCycleTimeout = setTimeout(() => {
    const randomId = activePool[Math.floor(Math.random() * activePool.length)];
    if (randomId) triggerFX(randomId);
    scheduleNextFX();
  }, delay);
}

// ---- Built-in Effects ----

// Matrix Glitch
registerFX("matrix-glitch", (duration) => {
  const app = $("#app");
  if (!app) return;
  
  app.classList.add("matrix-glitch-active");
  playGlitchHit();
  
  setTimeout(() => {
    app.classList.remove("matrix-glitch-active");
  }, duration);
});

// Retro Flash (Sample)
registerFX("retro-flash", (duration) => {
  document.body.style.filter = "invert(1) brightness(2)";
  setTimeout(() => {
    document.body.style.filter = "";
  }, Math.min(duration, 100)); // Very brief
});
