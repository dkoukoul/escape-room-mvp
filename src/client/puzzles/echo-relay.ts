// ============================================================
// Client Renderer: Echo Relay — The Echo Chamber of Hermes
// ============================================================

import { h, $, mount, clear } from "../lib/dom.ts";
import { emit, ClientEvents } from "../lib/socket.ts";
import { playSuccess, playFail } from "../audio/audio-manager.ts";
import type { PlayerView } from "@shared/types.ts";

export function renderEchoRelay(container: HTMLElement, view: PlayerView): void {
  mount(
    container,
    h("div", { className: "puzzle-header" },
      h("h2", { className: "title-lg" }, view.puzzleTitle),
      h("div", { className: "puzzle-role-badge" }, view.role),
    ),
  );

  const inner = h("div", { className: "echo-inner mt-lg w-full flex-col items-center" });
  mount(container, inner);

  if (view.role === "Γραφέας") {
    renderScribeView(inner, view);
  } else {
    renderTunerView(inner, view);
  }
}

function renderScribeView(container: HTMLElement, view: PlayerView): void {
  const data = view.viewData as Record<string, unknown>;
  const displayText = data.displayText as string;
  const charStates = data.charStates as string[];
  const decodedCount = data.decodedCount as number;
  const totalChars = data.totalChars as number;
  const wrongSubmissions = data.wrongSubmissions as number;
  const puzzleId = view.puzzleId;

  mount(container,
    h("p", { className: "subtitle mb-md" }, "Αποκωδικοποίησε το αρχαίο μήνυμα!"),
  );

  // Text display with per-character spans
  const textDisplay = h("div", { className: "echo-text-display" });
  for (let i = 0; i < displayText.length; i++) {
    const char = displayText[i]!;
    const state = charStates[i] ?? "decoded";
    const charClass = state === "decoded" ? "echo-char decoded" : "echo-char garbled";
    textDisplay.appendChild(
      h("span", { id: `echo-char-${i}`, className: charClass }, char)
    );
  }
  mount(container, textDisplay);

  // Progress
  const progressPct = totalChars > 0 ? Math.round((decodedCount / totalChars) * 100) : 0;
  mount(container,
    h("div", { className: "echo-progress-container mt-md" },
      h("p", { id: "echo-progress-text", className: "subtitle" },
        `Αποκωδικοποιημένα: ${decodedCount} / ${totalChars}`
      ),
      h("div", { className: "echo-progress-bar" },
        h("div", {
          id: "echo-progress-fill",
          className: "echo-progress-fill",
          style: `width: ${progressPct}%`,
        }),
      ),
    ),
  );

  // Submit button
  mount(container,
    h("button", {
      id: "echo-submit-btn",
      className: "btn btn-primary mt-md",
      onClick: () => {
        emit(ClientEvents.PUZZLE_ACTION, { puzzleId, action: "submit_decode", data: {} });
      },
    }, "Υποβολή Αποκωδικοποίησης"),
  );

  // Wrong submissions warning
  if (wrongSubmissions > 0) {
    mount(container,
      h("p", { id: "echo-wrong", className: "text-error mt-sm" },
        `Λανθασμένες υποβολές: ${wrongSubmissions}`
      ),
    );
  }
}

function renderTunerView(container: HTMLElement, view: PlayerView): void {
  const data = view.viewData as Record<string, unknown>;
  const dials = data.dials as { id: string; label: string; currentValue: number; minValue: number; maxValue: number; step: number }[];
  const decodedCount = data.decodedCount as number;
  const totalChars = data.totalChars as number;
  const puzzleId = view.puzzleId;

  mount(container,
    h("p", { className: "subtitle mb-md" }, "Δεν βλέπεις το κείμενο! Συνεργάσου με τον Γραφέα."),
  );

  // Dials
  for (const dial of dials) {
    const dialContainer = h("div", { className: "echo-dial-container mb-md" },
      h("label", { className: "echo-dial-label" }, dial.label),
      h("input", {
        id: `echo-dial-${dial.id}`,
        type: "range",
        className: "echo-dial-slider",
        min: String(dial.minValue),
        max: String(dial.maxValue),
        step: String(dial.step),
        value: String(dial.currentValue),
        onInput: (e: Event) => {
          const target = e.target as HTMLInputElement;
          const value = Number(target.value);
          // Update local display
          const valueEl = $(`#echo-dial-value-${dial.id}`);
          if (valueEl) valueEl.textContent = String(value);
          emit(ClientEvents.PUZZLE_ACTION, {
            puzzleId,
            action: "set_frequency",
            data: { dialId: dial.id, value },
          });
        },
      }),
      h("span", { id: `echo-dial-value-${dial.id}`, className: "echo-dial-value" },
        String(dial.currentValue)
      ),
    );
    mount(container, dialContainer);
  }

  // Progress
  const progressPct = totalChars > 0 ? Math.round((decodedCount / totalChars) * 100) : 0;
  mount(container,
    h("div", { className: "echo-progress-container mt-md" },
      h("p", { id: "echo-progress-text", className: "subtitle" },
        `Αποκωδικοποίηση: ${decodedCount} / ${totalChars} χαρακτήρες`
      ),
      h("div", { className: "echo-progress-bar" },
        h("div", {
          id: "echo-progress-fill",
          className: "echo-progress-fill",
          style: `width: ${progressPct}%`,
        }),
      ),
    ),
  );
}

export function updateEchoRelay(view: PlayerView): void {
  const container = $(".echo-inner");
  if (!container) return;

  clear(container);

  if (view.role === "Γραφέας") {
    renderScribeView(container, view);
  } else {
    renderTunerView(container, view);
  }
}
