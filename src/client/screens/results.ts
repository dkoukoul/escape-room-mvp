// ============================================================
// Results Screen — Victory / Defeat
// ============================================================

import { h, $, mount } from "../lib/dom.ts";
import { on, ServerEvents } from "../lib/socket.ts";
import { showScreen, showHUD } from "../lib/router.ts";
import { playSuccess, playFail } from "../audio/audio-manager.ts";
import { t } from "../lib/i18n.ts";
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
  showScreen("results", { name: "", value: 0, maxValue: 0, decayRate: 0 });
  showHUD(false);
  playSuccess();

  const minutes = Math.floor(data.elapsedSeconds / 60);
  const seconds = data.elapsedSeconds % 60;

  const screen = $("#screen-results")!;
  mount(
    screen,
    h("div", { className: "panel flex-col items-center gap-md text-center fade-in", style: "max-width: 500px;" },
      h("h1", { className: "title-xl", style: "color: var(--neon-green); filter: drop-shadow(0 0 20px rgba(57,255,20,0.5));" }, t("results.victory.title")),
      h("p", { className: "subtitle mt-md" }, t("results.victory.subtitle")),
      h("div", { className: "mt-lg flex-col gap-sm" },
        h("div", { className: "flex-row gap-md justify-center" },
          statCard(t("results.victory.stats.time"), `${minutes}:${String(seconds).padStart(2, "0")}`),
          statCard(t("results.victory.stats.glitch"), `${Math.round(data.glitchFinal)}%`),
          statCard(t("results.victory.stats.puzzles"), `${data.puzzlesCompleted}/5`),
          statCard(t("results.victory.stats.score"), `${data.score}`),
        ),
      ),
      h("button", {
        className: "btn btn-primary mt-xl",
        onClick: () => {
          localStorage.removeItem("odyssey_room_code");
          location.reload();
        },
      }, t("common.play_again")),
    ),
  );
}

function renderDefeat(data: DefeatPayload): void {
  showScreen("results", { name: "", value: 0, maxValue: 0, decayRate: 0 });
  showHUD(false);
  playFail();

  const reason = data.reason === "timer"
    ? t("results.defeat.reason.timer")
    : t("results.defeat.reason.glitch");

  const screen = $("#screen-results")!;
  mount(
    screen,
    h("div", { className: "panel flex-col items-center gap-md text-center fade-in", style: "max-width: 500px;" },
      h("h1", { className: "title-xl", style: "color: var(--neon-red); filter: drop-shadow(0 0 20px rgba(255,51,51,0.5));" }, t("results.defeat.title")),
      h("p", { className: "subtitle mt-md" }, reason),
      h("div", { className: "mt-lg flex-col gap-sm" },
        h("div", { className: "flex-row gap-md justify-center" },
          statCard(t("results.defeat.stats.reached"), `Puzzle ${data.puzzleReachedIndex + 1}/5`),
          statCard(t("results.defeat.stats.completed"), `${data.puzzlesCompleted}`),
          statCard(t("results.defeat.stats.cause"), data.reason.toUpperCase()),
        ),
      ),
      h("button", {
        className: "btn btn-danger mt-xl",
        onClick: () => {
          localStorage.removeItem("odyssey_room_code");
          location.reload();
        },
      }, t("common.try_again")),
    ),
  );
}

function statCard(label: string, value: string): HTMLElement {
  return h("div", { className: "flex-col items-center", style: "min-width: 80px;" },
    h("span", { className: "hud-label" }, label),
    h("span", { className: "hud-value", style: "font-size: 1.3rem;" }, value),
  );
}
