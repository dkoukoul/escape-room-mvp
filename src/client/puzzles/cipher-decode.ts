// ============================================================
// Client: Cipher Decode — Substitution cipher
// ============================================================

import { h, $, mount, clear } from "../lib/dom.ts";
import { emit, ClientEvents } from "../lib/socket.ts";
import { playSuccess, playFail } from "../audio/audio-manager.ts";
import type { PlayerView } from "@shared/types.ts";

export function renderCipherDecode(container: HTMLElement, view: PlayerView): void {
  const data = view.viewData as Record<string, unknown>;
  const completedSentences = data.completedSentences as number;
  const totalSentences = data.totalSentences as number;

  if (view.role === "Cryptographer") {
    renderCryptographerView(container, data);
  } else {
    renderScribeView(container, data);
  }
}

function renderCryptographerView(container: HTMLElement, data: Record<string, unknown>): void {
  const cipherKey = data.cipherKey as Record<string, string>;
  const currentEncrypted = data.currentEncrypted as string;
  const hint = data.hint as string;
  const completed = data.completedSentences as number;
  const total = data.totalSentences as number;

  mount(
    container,
    h("div", { className: "puzzle-header" },
      h("h2", { className: "title-lg" }, "The Philosopher's Cipher"),
      h("div", { className: "puzzle-role-badge" }, "Cryptographer"),
    ),
    h("p", { className: "subtitle mt-md" }, "Share the cipher key with your Scribes!"),

    // Cipher key grid
    h("div", { className: "cipher-display mt-lg" },
      h("p", { className: "hud-label" }, "CIPHER KEY"),
      h("div", { id: "cipher-key-grid", className: "cipher-key-grid mt-sm" },
        ...Object.entries(cipherKey).map(([from, to]) =>
          h("div", { className: "cipher-pair" },
            h("span", { className: "cipher-from" }, from),
            h("span", { className: "cipher-arrow" }, " → "),
            h("span", { className: "cipher-to" }, to as string),
          )
        ),
      ),
    ),

    h("div", { className: "mt-lg" },
      h("p", { className: "hud-label" }, "CURRENT ENCRYPTED TEXT"),
      h("div", { id: "cipher-encrypted", className: "cipher-encrypted mt-sm" }, currentEncrypted),
      h("p", { className: "cipher-hint mt-sm" }, `Hint: "${hint}"`),
    ),

    h("p", { id: "cipher-progress", className: "subtitle mt-md" },
      `Sentence ${completed + 1} / ${total}`),
  );
}

function renderScribeView(container: HTMLElement, data: Record<string, unknown>): void {
  const currentEncrypted = data.currentEncrypted as string;
  const hint = data.hint as string;
  const completed = data.completedSentences as number;
  const total = data.totalSentences as number;
  const myAttempts = (data.myAttempts as string[]) ?? [];

  mount(
    container,
    h("div", { className: "puzzle-header" },
      h("h2", { className: "title-lg" }, "The Philosopher's Cipher"),
      h("div", { className: "puzzle-role-badge" }, "Scribe"),
    ),
    h("p", { className: "subtitle mt-md" }, "Decode the encrypted text using the key from your Cryptographer!"),

    h("div", { className: "cipher-display mt-lg" },
      h("p", { className: "hud-label" }, "ENCRYPTED TEXT"),
      h("div", { id: "cipher-encrypted", className: "cipher-encrypted mt-sm" }, currentEncrypted),
      h("p", { className: "cipher-hint mt-sm" }, `Hint: "${hint}"`),
    ),

    h("div", { className: "mt-lg flex-col gap-sm items-center w-full", style: "max-width: 500px;" },
      h("input", {
        id: "cipher-input",
        className: "input cipher-input",
        type: "text",
        placeholder: "Type decoded text...",
        autocomplete: "off",
        style: "text-align: left; letter-spacing: 2px;",
      }),
      h("button", {
        id: "cipher-submit",
        className: "btn btn-primary",
        onClick: handleSubmit,
      }, "Submit Decode"),
    ),

    // Previous attempts
    myAttempts.length > 0
      ? h("div", { className: "mt-md" },
          h("p", { className: "hud-label" }, "YOUR ATTEMPTS"),
          ...myAttempts.map((a) =>
            h("p", { className: "subtitle", style: "color: var(--neon-red);" }, `✗ ${a}`)
          ),
        )
      : null,

    h("p", { id: "cipher-progress", className: "subtitle mt-md" },
      `Sentence ${completed + 1} / ${total}`),
  );

  // Add enter key handler
  const input = $("#cipher-input") as HTMLInputElement;
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSubmit();
    });
    input.focus();
  }
}

function handleSubmit(): void {
  const input = $("#cipher-input") as HTMLInputElement;
  if (!input || !input.value.trim()) return;

  emit(ClientEvents.PUZZLE_ACTION, {
    puzzleId: "",
    action: "submit_decode",
    data: { text: input.value.trim() },
  });

  input.value = "";
}

export function updateCipherDecode(view: PlayerView): void {
  const data = view.viewData as Record<string, unknown>;
  const currentEncrypted = data.currentEncrypted as string;
  const completed = data.completedSentences as number;
  const total = data.totalSentences as number;

  const encryptedEl = $("#cipher-encrypted");
  if (encryptedEl) encryptedEl.textContent = currentEncrypted;

  const progressEl = $("#cipher-progress");
  if (progressEl) progressEl.textContent = `Sentence ${Math.min(completed + 1, total)} / ${total}`;

  if (completed === total) {
    playSuccess();
  }
}
