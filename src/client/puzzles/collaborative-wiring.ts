// ============================================================
// Client: Collaborative Wiring — Circuit switches
// ============================================================

import { h, $, $$, mount, clear } from "../lib/dom.ts";
import { emit, ClientEvents } from "../lib/socket.ts";
import { playGlitchHit, playSuccess } from "../audio/audio-manager.ts";
import type { PlayerView } from "@shared/types.ts";

export function renderCollaborativeWiring(container: HTMLElement, view: PlayerView): void {
  const data = view.viewData as Record<string, unknown>;
  const gridSize = data.gridSize as number;
  const columnsLit = data.columnsLit as boolean[];
  const mySwitches = data.mySwitches as number[];
  const switchStates = data.switchStates as boolean[];
  const attempts = data.attempts as number;
  const maxAttempts = data.maxAttempts as number;
  const currentRound = (data.currentRound as number ?? 0) + 1;
  const roundsToPlay = data.roundsToPlay as number ?? 1;

  mount(
    container,
    h("div", { className: "puzzle-header" },
      h("h2", { className: "title-lg" }, "The Columns of Logic"),
      h("div", { className: "puzzle-role-badge" }, "Engineer"),
    ),
    h("div", { className: "flex-row justify-between items-center mt-md" },
      h("p", { className: "subtitle" }, "Toggle your switches to light ALL columns"),
      h("p", { id: "wiring-rounds", className: "badge" }, `Board ${currentRound}/${roundsToPlay}`),
    ),

    // Columns display
    h("div", { className: "wiring-board mt-lg" },
      h("div", { id: "wiring-columns", className: "wiring-columns" },
        ...Array.from({ length: gridSize }, (_, i) =>
          h("div", {
            className: `wiring-column ${columnsLit[i] ? "lit" : ""}`,
            id: `col-${i}`,
          }, `Col ${i + 1}`)
        ),
      ),

      // Switches
      h("div", { id: "wiring-switches", className: "wiring-switches mt-lg" },
        ...switchStates.map((state, i) => {
          const isMine = mySwitches.includes(i);
          return h("div", {
            className: `wiring-switch ${isMine ? "mine" : "locked"} ${state ? "on" : ""}`,
            id: `switch-${i}`,
            onClick: () => isMine && handleToggle(i),
          }, `S${i + 1}`);
        }),
      ),

      h("div", { className: "mt-md flex-row gap-md justify-center items-center" },
        h("p", { id: "wiring-attempts", className: "subtitle" }, `Attempts: ${attempts}/${maxAttempts}`),
        h("button", {
          id: "wiring-check",
          className: "btn btn-primary",
          onClick: handleCheck,
        }, "Check Solution"),
      ),
    ),
  );
}

function handleToggle(switchIndex: number): void {
  emit(ClientEvents.PUZZLE_ACTION, {
    puzzleId: "",
    action: "toggle_switch",
    data: { switchIndex },
  });

  // Optimistic toggle
  const el = $(`#switch-${switchIndex}`);
  if (el) el.classList.toggle("on");
}

function handleCheck(): void {
  emit(ClientEvents.PUZZLE_ACTION, {
    puzzleId: "",
    action: "check_solution",
    data: {},
  });
}

export function updateCollaborativeWiring(view: PlayerView): void {
  const data = view.viewData as Record<string, unknown>;
  const columnsLit = data.columnsLit as boolean[];
  const switchStates = data.switchStates as boolean[];
  const attempts = data.attempts as number;
  const maxAttempts = data.maxAttempts as number;

  // Update columns
  columnsLit.forEach((lit, i) => {
    const el = $(`#col-${i}`);
    if (el) el.classList.toggle("lit", lit);
  });

  // Update switches
  switchStates.forEach((state, i) => {
    const el = $(`#switch-${i}`);
    if (el) el.classList.toggle("on", state);
  });

  // Update attempts
  const attemptsEl = $("#wiring-attempts");
  if (attemptsEl) attemptsEl.textContent = `Attempts: ${attempts}/${maxAttempts}`;

  // Update rounds
  const roundsEl = $("#wiring-rounds");
  const currentRound = (data.currentRound as number ?? 0) + 1;
  const roundsToPlay = data.roundsToPlay as number ?? 1;
  if (roundsEl) roundsEl.textContent = `Board ${currentRound}/${roundsToPlay}`;

  // Check if all lit
  if (columnsLit.every(Boolean)) {
    playSuccess();
  }
}
