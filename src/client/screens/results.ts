// ============================================================
// Results Screen — Victory / Defeat
// ============================================================

import { h, $, mount } from "../lib/dom.ts";
import { on, ServerEvents } from "../lib/socket.ts";
import { showScreen, showHUD } from "../lib/router.ts";
import { playSuccess, playFail } from "../audio/audio-manager.ts";
import type { VictoryPayload, DefeatPayload } from "@shared/events.ts";

export function initResults(): void {
  on(ServerEvents.VICTORY, (data: VictoryPayload) => {
    renderVictory(data);
  });

  on(ServerEvents.DEFEAT, (data: DefeatPayload) => {
    renderDefeat(data);
  });
}

function renderVictory(data: VictoryPayload): void {
  showScreen("results");
  showHUD(false);
  playSuccess();

  const minutes = Math.floor(data.elapsedSeconds / 60);
  const seconds = data.elapsedSeconds % 60;

  const screen = $("#screen-results")!;
  mount(
    screen,
    h("div", { className: "panel flex-col items-center gap-md text-center fade-in", style: "max-width: 500px;" },
      h("h1", { className: "title-xl", style: "color: var(--neon-green); filter: drop-shadow(0 0 20px rgba(57,255,20,0.5));" }, "MISSION COMPLETE"),
      h("p", { className: "subtitle mt-md" }, "The Parthenon has been restored. Democracy is saved."),
      h("div", { className: "mt-lg flex-col gap-sm" },
        h("div", { className: "flex-row gap-md justify-center" },
          statCard("TIME", `${minutes}:${String(seconds).padStart(2, "0")}`),
          statCard("GLITCH", `${Math.round(data.glitchFinal)}%`),
          statCard("PUZZLES", `${data.puzzlesCompleted}/5`),
          statCard("SCORE", `${data.score}`),
        ),
      ),
      h("button", {
        className: "btn btn-primary mt-xl",
        onClick: () => location.reload(),
      }, "Play Again"),
    ),
  );
}

function renderDefeat(data: DefeatPayload): void {
  showScreen("results");
  showHUD(false);
  playFail();

  const reason = data.reason === "timer"
    ? "Time has expired. The Chronos Virus has consumed Ancient Greece."
    : "Glitch overload. The simulation has collapsed.";

  const screen = $("#screen-results")!;
  mount(
    screen,
    h("div", { className: "panel flex-col items-center gap-md text-center fade-in", style: "max-width: 500px;" },
      h("h1", { className: "title-xl", style: "color: var(--neon-red); filter: drop-shadow(0 0 20px rgba(255,51,51,0.5));" }, "MISSION FAILED"),
      h("p", { className: "subtitle mt-md" }, reason),
      h("div", { className: "mt-lg flex-col gap-sm" },
        h("div", { className: "flex-row gap-md justify-center" },
          statCard("REACHED", `Puzzle ${data.puzzleReachedIndex + 1}/5`),
          statCard("COMPLETED", `${data.puzzlesCompleted}`),
          statCard("CAUSE", data.reason.toUpperCase()),
        ),
      ),
      h("button", {
        className: "btn btn-danger mt-xl",
        onClick: () => location.reload(),
      }, "Try Again"),
    ),
  );
}

function statCard(label: string, value: string): HTMLElement {
  return h("div", { className: "flex-col items-center", style: "min-width: 80px;" },
    h("span", { className: "hud-label" }, label),
    h("span", { className: "hud-value", style: "font-size: 1.3rem;" }, value),
  );
}
