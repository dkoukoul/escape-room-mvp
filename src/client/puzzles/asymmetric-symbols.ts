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

// Track active spawner settings so we can restart it if the server config changes
let activeSpawnMs = 0;
let activeLifetimeMs = 0;
let activeDecoyRatio = 0;
let activeCurrentWord = "";

// Simple seeded PRNG to sync letter generation between clients
let prngSeed = 1234567;
function prng() {
  prngSeed = (prngSeed * 9301 + 49297) % 233280;
  return prngSeed / 233280;
}

// Track which letters from the current word still need to be spawned
let pendingLetters: string[] = [];

// Global spawn counter to keep all clients in sync
let globalSpawnCounter = 0;

function initPendingLetters(word: string): void {
  // Split word into individual letters that need to be spawned
  pendingLetters = word.split("").filter(c => c !== "_");
}

function updatePendingLetters(captured: string[]): void {
  // Remove captured letters from pending letters
  const capturedLetters = captured.filter(c => c !== "_");
  
  // Create a copy of pending letters to modify
  const newPending: string[] = [...pendingLetters];
  
  // Remove each captured letter from pending
  for (const letter of capturedLetters) {
    const index = newPending.indexOf(letter);
    if (index > -1) {
      newPending.splice(index, 1);
    }
  }
  
  pendingLetters = newPending;
}

export function renderAsymmetricSymbols(
  container: HTMLElement,
  view: PlayerView,
  roles: RoleAssignment[]
): void {
  currentView = view;
  const data = view.viewData as Record<string, unknown>;
  const title = view.puzzleTitle;
  if (view.role === "Navigator") {
    renderNavigatorView(container, title, data);
  } else {
    renderDecoderView(container, title, data);
  }
}

function renderNavigatorView(container: HTMLElement, title: string, data: Record<string, unknown>): void {
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
      h("h2", { className: "title-lg" }, title),
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

  activeSpawnMs = spawnMs;
  activeLifetimeMs = lifetimeMs;
  activeDecoyRatio = decoyRatio;
  activeCurrentWord = currentWord;

  // Initialize PRNG seed and spawn counter for initial render
  prngSeed = 1234567;
  globalSpawnCounter = 0;

  // Initialize pending letters for the current word
  initPendingLetters(currentWord);

  startLetterSpawner("nav-arena", spawnMs, lifetimeMs, decoyRatio, false);
}

function renderDecoderView(container: HTMLElement, title: string, data: Record<string, unknown>): void {
  const spawnMs = (data.spawnIntervalMs as number) ?? 800;
  const lifetimeMs = (data.letterLifetimeMs as number) ?? 4000;
  const decoyRatio = (data.decoyRatio as number) ?? 0.3;
  const totalWords = data.totalWords as number;
  const completedWords = (data.completedWords as number) ?? 0;
  const currentWordLength = data.currentWordLength as number;
  const capturedLetters = data.capturedLetters as string[];

  // Get the actual current word from solution words for proper pending letter tracking
  const solutionWords = data.solutionWords as string[];
  const currentWordIndex = data.currentWordIndex as number;
  const currentWord = solutionWords[currentWordIndex] ?? "";

  mount(
    container,
    h("div", { className: "puzzle-header" },
      h("h2", { className: "title-lg" }, title),
      h("div", { className: "puzzle-role-badge" }, "Decoder"),
    ),
    h("p", { className: "subtitle mt-md" }, "Catch the letters your Navigator calls out!"),
    h("div", { className: "mt-sm flex-row gap-md justify-center" },
      h("p", { id: "decoder-progress", className: "subtitle" }, `Words: ${completedWords}/${totalWords}`),
      h("p", { id: "decoder-captured", className: "subtitle" }, `Captured: ${capturedLetters?.join("") ?? ""}`),
    ),
    h("div", { id: "decoder-arena", className: "decoder-arena mt-md" }),
  );

  activeSpawnMs = spawnMs;
  activeLifetimeMs = lifetimeMs;
  activeDecoyRatio = decoyRatio;
  activeCurrentWord = currentWord;

  // Initialize PRNG seed and spawn counter for initial render
  prngSeed = 1234567;
  globalSpawnCounter = 0;

  // Initialize pending letters with the actual current word (same as Navigator)
  initPendingLetters(currentWord);

  // Start spawning letters
  startLetterSpawner("decoder-arena", spawnMs, lifetimeMs, decoyRatio, true);
}

function startLetterSpawner(arenaId: string, intervalMs: number, lifetimeMs: number, decoyRatio: number, interactable: boolean): void {
  if (spawnInterval) clearInterval(spawnInterval);

  const arena = $(`#${arenaId}`);
  if (!arena) return;

  // NOTE: PRNG seed and spawn counter are NOT reset here anymore.
  // They are only reset when the word changes (in updateAsymmetricSymbols).
  // This ensures all clients stay in sync even if they receive updates at different times.
  
  // Reset pending letters counter for batch spawning
  let lettersSpawnedInBatch = 0;
  const batchSize = 4; // Spawn letters in batches of 4

  spawnInterval = setInterval(() => {
    // Validate decoy ratio (must be between 0 and 0.9)
    const validRatio = Math.max(0, Math.min(0.9, decoyRatio));
    
    // Determine how many valid letters and decoys to spawn in this batch
    // For example, with ratio 0.5 and batch size 4: 2 valid, 2 decoys
    const validLettersCount = Math.floor(batchSize * (1 - validRatio));
    const decoysCount = batchSize - validLettersCount;
    
    // Decide which type to spawn based on current position in batch
    const shouldSpawnValid = lettersSpawnedInBatch < validLettersCount;
    
    let letter: string;
    let isDecoy: boolean;
    let xPercent: number;
    let yPercent: number;
    
    // TRULY DETERMINISTIC APPROACH:
    // Pre-generate ALL randomness for this spawn cycle to ensure perfect sync
    // Every spawn consumes exactly 5 PRNG values in a FIXED order:
    
    // PRNG call #1: Type decision roll (0.0-1.0)
    const typeRoll = prng();
    
    // PRNG call #2: Letter selection roll (0.0-1.0) 
    const letterRoll = prng();
    
    // PRNG call #3: Position X roll (0.0-1.0)
    const xRoll = prng();
    
    // PRNG call #4: Position Y roll (0.0-1.0)
    const yRoll = prng();
    
    // PRNG call #5: Unused but consumed for sync
    const dummyRoll = prng();
    
    // Now apply deterministic logic based on pre-generated rolls
    if (shouldSpawnValid && pendingLetters.length > 0) {
      // Spawn a valid letter from the word
      const randomIndex = Math.floor(letterRoll * pendingLetters.length);
      letter = pendingLetters[randomIndex]!;
      isDecoy = false;
    } else {
      // Spawn a decoy letter (random Greek letter not in pending letters)
      const availableDecoys = GREEK_LETTERS.filter(l => !pendingLetters.includes(l));
      if (availableDecoys.length > 0) {
        const randomIndex = Math.floor(letterRoll * availableDecoys.length);
        letter = availableDecoys[randomIndex]!;
      } else {
        // Fallback if all letters are in the word
        const randomIndex = Math.floor(letterRoll * GREEK_LETTERS.length);
        letter = GREEK_LETTERS[randomIndex]!;
      }
      isDecoy = true;
    }
    
    // Convert rolls to actual positions
    xPercent = (xRoll * 85) + 5; // 5% to 90%
    yPercent = (yRoll * 85) + 5; // 5% to 90%
    
    spawnLetter(arena, letter, isDecoy, lifetimeMs, interactable, xPercent, yPercent);
    
    lettersSpawnedInBatch++;
    if (lettersSpawnedInBatch >= batchSize) {
      lettersSpawnedInBatch = 0;
    }
    
    globalSpawnCounter++;
  }, intervalMs);
}

function spawnLetter(arena: HTMLElement, letter: string, isDecoy: boolean, lifetimeMs: number, interactable: boolean, xPercent: number, yPercent: number): void {
  // Use pre-calculated percentages to keep it looking identical regardless of screen size
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
  const puzzleActionMsg = {
    puzzleId: currentView?.puzzleId ?? "",
    action: "capture_letter",
    data: { letter }
  };
  // Send capture action to server
  emit(ClientEvents.PUZZLE_ACTION, puzzleActionMsg);

  // Visual feedback (server will confirm correctness)
  el.classList.add("captured");
  setTimeout(() => el.remove(), 300);
}

export function updateAsymmetricSymbols(view: PlayerView): void {
  currentView = view;
  const data = view.viewData as Record<string, unknown>;

  const spawnMs = (data.spawnIntervalMs as number) ?? 800;
  const lifetimeMs = (data.letterLifetimeMs as number) ?? 4000;
  const decoyRatio = (data.decoyRatio as number) ?? 0.3;

  // Get solution words and current word index for both roles
  // IMPORTANT: Both Navigator and Decoder must use the actual word letters for PRNG sync
  const solutionWords = data.solutionWords as string[];
  const currentWordIndex = data.currentWordIndex as number;
  const currentWord = solutionWords?.[currentWordIndex] ?? "";
  const captured = data.capturedLetters as string[];

  // Check if word changed - if so, reset PRNG and pending letters for sync
  const wordChanged = currentWord !== activeCurrentWord && currentWord !== "" && currentWord !== "✓";
  const configChanged = spawnMs !== activeSpawnMs || lifetimeMs !== activeLifetimeMs || decoyRatio !== activeDecoyRatio;

  if (wordChanged || configChanged) {
    activeSpawnMs = spawnMs;
    activeLifetimeMs = lifetimeMs;
    activeDecoyRatio = decoyRatio;

    if (wordChanged) {
      // Word changed: reset PRNG seed and pending letters for all clients
      activeCurrentWord = currentWord;
      initPendingLetters(currentWord);
      prngSeed = 1234567;
      globalSpawnCounter = 0;
    }

    const isDecoder = view.role !== "Navigator";
    const arenaId = isDecoder ? "decoder-arena" : "nav-arena";
    startLetterSpawner(arenaId, spawnMs, lifetimeMs, decoyRatio, isDecoder);
  } else {
    // Update pending letters based on what's been captured
    updatePendingLetters(captured);
  }

  if (view.role === "Navigator") {
    const completed = data.completedWords as string[];

    const wordEl = $("#nav-current-word");
    if (wordEl) wordEl.textContent = currentWord || "✓";

    const capturedEl = $("#nav-captured");
    if (capturedEl) capturedEl.textContent = captured.join("");

    const progressEl = $("#nav-progress");
    if (progressEl) {
      progressEl.textContent = `Word ${Math.min(currentWordIndex + 1, solutionWords.length)} / ${solutionWords.length} — ${completed.length} completed`;
    }

    if (completed.length > 0) playSuccess();
  } else {
    const completedWords = (data.completedWords as number) ?? 0;
    const totalWords = data.totalWords as number;

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
