// ============================================================
// Client: Rhythm Tap — Color sequence matching
// ============================================================

import { h, $, $$, mount, clear } from "../lib/dom.ts";
import { emit, ClientEvents } from "../lib/socket.ts";
import { playSuccess, playFail } from "../audio/audio-manager.ts";
import type { PlayerView } from "@shared/types.ts";

const COLORS = ["blue", "red", "green", "yellow"];
let playerTaps: string[] = [];
let currentSequence: string[] = [];
let isShowingSequence = false;

export function renderRhythmTap(container: HTMLElement, view: PlayerView): void {
  const data = view.viewData as Record<string, unknown>;
  currentSequence = data.currentSequence as string[];
  const currentRound = data.currentRound as number;
  const roundsToWin = data.roundsToWin as number;
  const playbackSpeed = (data.playbackSpeedMs as number) ?? 800;

  playerTaps = [];

  mount(
    container,
    h("div", { className: "puzzle-header" },
      h("h2", { className: "title-lg" }, "The Oracle's Frequency"),
      h("div", { className: "puzzle-role-badge" }, "Hoplite"),
    ),
    h("p", { id: "rhythm-status", className: "rhythm-status mt-md" },
      `Round ${currentRound + 1} / ${roundsToWin}`),
    h("p", { id: "rhythm-instruction", className: "subtitle mt-sm" }, "Watch the sequence..."),
    h("div", { id: "rhythm-pads", className: "rhythm-pads mt-lg" },
      ...COLORS.map((color) =>
        h("div", {
          id: `pad-${color}`,
          className: `rhythm-pad ${color}`,
          onClick: () => handlePadTap(color),
        }, color)
      ),
    ),
    h("div", { className: "mt-md flex-row gap-sm justify-center" },
      h("p", { id: "rhythm-taps", className: "subtitle" }, "Your taps: —"),
      h("button", {
        id: "rhythm-submit",
        className: "btn",
        onClick: handleSubmit,
        disabled: true,
      }, "Submit"),
    ),
    h("div", { id: "rhythm-players", className: "mt-sm" },
      h("p", { className: "subtitle" },
        `${data.playersReady as number} / ${data.totalPlayers as number} players ready`),
    ),
  );

  // Play the sequence demonstration
  setTimeout(() => playSequence(currentSequence, playbackSpeed), 1000);
}

function playSequence(sequence: string[], speed: number): void {
  isShowingSequence = true;
  const instructionEl = $("#rhythm-instruction");
  if (instructionEl) instructionEl.textContent = "Watch carefully...";

  sequence.forEach((color, i) => {
    setTimeout(() => {
      flashPad(color);
    }, i * speed);
  });

  // After sequence finishes, enable input
  setTimeout(() => {
    isShowingSequence = false;
    if (instructionEl) instructionEl.textContent = "Your turn! Tap the sequence.";
    const submitBtn = $("#rhythm-submit") as HTMLButtonElement;
    if (submitBtn) submitBtn.disabled = false;
  }, sequence.length * speed + 300);
}

function flashPad(color: string): void {
  const pad = $(`#pad-${color}`);
  if (!pad) return;
  pad.classList.add("flash", "active");
  setTimeout(() => pad.classList.remove("flash", "active"), 350);
}

function handlePadTap(color: string): void {
  if (isShowingSequence) return;

  playerTaps.push(color);
  flashPad(color);

  const tapsEl = $("#rhythm-taps");
  if (tapsEl) tapsEl.textContent = `Your taps: ${playerTaps.join(" → ")}`;
}

function handleSubmit(): void {
  emit(ClientEvents.PUZZLE_ACTION, {
    puzzleId: "",
    action: "submit_sequence",
    data: { taps: playerTaps },
  });

  playerTaps = [];
  const tapsEl = $("#rhythm-taps");
  if (tapsEl) tapsEl.textContent = "Your taps: submitted!";

  const submitBtn = $("#rhythm-submit") as HTMLButtonElement;
  if (submitBtn) submitBtn.disabled = true;
}

export function updateRhythmTap(view: PlayerView): void {
  const data = view.viewData as Record<string, unknown>;
  const currentRound = data.currentRound as number;
  const roundsToWin = data.roundsToWin as number;
  const roundResults = data.roundResults as boolean[];
  const playersReady = data.playersReady as number;
  const totalPlayers = data.totalPlayers as number;

  const statusEl = $("#rhythm-status");
  if (statusEl) statusEl.textContent = `Round ${currentRound + 1} / ${roundsToWin}`;

  const playersEl = $("#rhythm-players");
  if (playersEl) {
    mount(playersEl,
      h("p", { className: "subtitle" }, `${playersReady} / ${totalPlayers} players ready`)
    );
  }

  // New round started
  if (data.showingSequence) {
    currentSequence = data.currentSequence as string[];
    playerTaps = [];

    const lastResult = roundResults[roundResults.length - 1];
    if (lastResult === true) {
      playSuccess();
    } else if (lastResult === false) {
      playFail();
    }

    const tapsEl = $("#rhythm-taps");
    if (tapsEl) tapsEl.textContent = "Your taps: —";

    setTimeout(() => {
      playSequence(currentSequence, (data.playbackSpeedMs as number) ?? 800);
    }, 1500);
  }
}
