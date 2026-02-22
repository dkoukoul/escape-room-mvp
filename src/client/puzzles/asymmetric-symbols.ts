// ============================================================
// Client: Asymmetric Symbols — Flying Letters UI
// ============================================================

import { h, $, mount, clear } from "../lib/dom.ts";
import { emit, ClientEvents, getPlayerId } from "../lib/socket.ts";
import { playGlitchHit, playSuccess } from "../audio/audio-manager.ts";
import type { PlayerView, RoleAssignment } from "@shared/types.ts";

// All Greek letters for decoy spawning
const GREEK_LETTERS = "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ".split("");

let spawnInterval: ReturnType<typeof setInterval> | null = null;
let currentView: PlayerView | null = null;

// Simple seeded PRNG to sync letter generation between clients
let prngSeed = 1234567;
function prng() {
  prngSeed = (prngSeed * 9301 + 49297) % 233280;
  return prngSeed / 233280;
}

export function renderAsymmetricSymbols(
  container: HTMLElement,
  view: PlayerView,
  roles: RoleAssignment[]
): void {
  currentView = view;
  const data = view.viewData as Record<string, unknown>;

  if (view.role === "Navigator") {
    renderNavigatorView(container, data);
  } else {
    renderDecoderView(container, data);
  }
}

function renderNavigatorView(container: HTMLElement, data: Record<string, unknown>): void {
  const words = data.solutionWords as string[];
  const currentIdx = data.currentWordIndex as number;
  const captured = data.capturedLetters as string[];
  const completed = data.completedWords as string[];
  const currentWord = words[currentIdx] ?? "";

  const spawnMs = (data.spawnIntervalMs as number) ?? 800;
  const lifetimeMs = (data.letterLifetimeMs as number) ?? 4000;
  const decoyRatio = (data.decoyRatio as number) ?? 0.3;

  mount(
    container,
    h("div", { className: "puzzle-header" },
      h("h2", { className: "title-lg" }, "The Neon Propylaea"),
      h("div", { className: "puzzle-role-badge" }, "Navigator"),
    ),
    h("p", { className: "subtitle mt-md" }, "Guide your Decoders — tell them which letters to catch!"),
    h("div", { id: "nav-current-word", className: "nav-word-display mt-lg" }, currentWord),
    h("div", { className: "mt-md" },
      h("p", { className: "hud-label" }, "CAPTURED"),
      h("p", { id: "nav-captured", className: "nav-captured" }, captured.join("")),
    ),
    h("p", { id: "nav-progress", className: "nav-progress mt-md" },
      `Word ${Math.min(currentIdx + 1, words.length)} / ${words.length} — ${completed.length} completed`),
    h("div", { id: "nav-arena", className: "decoder-arena mt-md navigator-arena" }) // Read-only arena
  );

  startLetterSpawner("nav-arena", spawnMs, lifetimeMs, decoyRatio, false);
}

function renderDecoderView(container: HTMLElement, data: Record<string, unknown>): void {
  const spawnMs = (data.spawnIntervalMs as number) ?? 800;
  const lifetimeMs = (data.letterLifetimeMs as number) ?? 4000;
  const decoyRatio = (data.decoyRatio as number) ?? 0.3;
  const totalWords = data.totalWords as number;
  const completedWords = (data.completedWords as number) ?? 0;

  mount(
    container,
    h("div", { className: "puzzle-header" },
      h("h2", { className: "title-lg" }, "The Neon Propylaea"),
      h("div", { className: "puzzle-role-badge" }, "Decoder"),
    ),
    h("p", { className: "subtitle mt-md" }, "Catch the letters your Navigator calls out!"),
    h("div", { className: "mt-sm flex-row gap-md justify-center" },
      h("p", { id: "decoder-progress", className: "subtitle" }, `Words: ${completedWords}/${totalWords}`),
      h("p", { id: "decoder-captured", className: "subtitle" }, `Captured: ${(data.capturedLetters as string[])?.join("") ?? ""}`),
    ),
    h("div", { id: "decoder-arena", className: "decoder-arena mt-md" }),
  );

  // Start spawning letters
  startLetterSpawner("decoder-arena", spawnMs, lifetimeMs, decoyRatio, true);
}

function startLetterSpawner(arenaId: string, intervalMs: number, lifetimeMs: number, decoyRatio: number, interactable: boolean): void {
  if (spawnInterval) clearInterval(spawnInterval);

  const arena = $(`#${arenaId}`);
  if (!arena) return;

  // Reset PRNG seed so all clients generate the same sequence
  prngSeed = 1234567;

  spawnInterval = setInterval(() => {
    const isDecoy = prng() < decoyRatio;
    const letter = GREEK_LETTERS[Math.floor(prng() * GREEK_LETTERS.length)]!;
    spawnLetter(arena, letter, isDecoy, lifetimeMs, interactable);
  }, intervalMs);
}

function spawnLetter(arena: HTMLElement, letter: string, isDecoy: boolean, lifetimeMs: number, interactable: boolean): void {
  // Use percentages to keep it looking identical regardless of screen size
  const xPercent = (prng() * 85) + 5; // 5% to 90%
  const yPercent = (prng() * 85) + 5; // 5% to 90%

  const elProps: Record<string, any> = {
    className: `flying-letter ${isDecoy ? "decoy" : "correct"} ${!interactable ? "read-only" : ""}`,
    style: `left: ${xPercent}%; top: ${yPercent}%; animation-duration: ${lifetimeMs}ms;`,
  };

  if (interactable) {
    elProps.onClick = () => handleLetterClick(elProps.elRef, letter);
  }

  const el = h("div", elProps, letter);
  elProps.elRef = el; // Store ref for onClick circular dependency

  arena.appendChild(el);

  // Auto-remove after lifetime
  setTimeout(() => {
    if (el.parentNode) el.remove();
  }, lifetimeMs);
}

function handleLetterClick(el: HTMLElement, letter: string): void {
  // Send capture action to server
  emit(ClientEvents.PUZZLE_ACTION, {
    puzzleId: currentView?.puzzleId ?? "",
    action: "capture_letter",
    data: { letter },
  });

  // Visual feedback (server will confirm correctness)
  el.classList.add("captured");
  setTimeout(() => el.remove(), 300);
}

export function updateAsymmetricSymbols(view: PlayerView): void {
  currentView = view;
  const data = view.viewData as Record<string, unknown>;

  if (view.role === "Navigator") {
    const words = data.solutionWords as string[];
    const currentIdx = data.currentWordIndex as number;
    const captured = data.capturedLetters as string[];
    const completed = data.completedWords as string[];
    const currentWord = words[currentIdx] ?? "✓";

    const wordEl = $("#nav-current-word");
    if (wordEl) wordEl.textContent = currentWord;

    const capturedEl = $("#nav-captured");
    if (capturedEl) capturedEl.textContent = captured.join("");

    const progressEl = $("#nav-progress");
    if (progressEl) {
      progressEl.textContent = `Word ${Math.min(currentIdx + 1, words.length)} / ${words.length} — ${completed.length} completed`;
    }

    if (completed.length > 0) playSuccess();
  } else {
    const completedWords = (data.completedWords as number) ?? 0;
    const totalWords = data.totalWords as number;
    const captured = data.capturedLetters as string[];

    const progressEl = $("#decoder-progress");
    if (progressEl) progressEl.textContent = `Words: ${completedWords}/${totalWords}`;

    const capturedEl = $("#decoder-captured");
    if (capturedEl) capturedEl.textContent = `Captured: ${captured.join("")}`;
  }
}

// Cleanup on unmount
export function cleanupAsymmetricSymbols(): void {
  if (spawnInterval) {
    clearInterval(spawnInterval);
    spawnInterval = null;
  }
}
