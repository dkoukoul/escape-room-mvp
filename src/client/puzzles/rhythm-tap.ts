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

export function renderRhythmTap(container: HTMLElement, view: PlayerView): void {
  const data = view.viewData as Record<string, unknown>;
  currentSequence = data.currentSequence as string[];
  const currentRound = data.currentRound as number;
  const roundsToWin = data.roundsToWin as number;
  const playbackSpeed = (data.playbackSpeedMs as number) ?? 800;
  const role = view.role.toLowerCase();
  playerTaps = [];


  mount(
    container,
    h("div", { className: "puzzle-header" },
      h("h2", { className: "title-lg" }, "The Oracle's Frequency"),
      h("div", { className: "puzzle-role-badge" }, role),
    ),
    h("p", { id: "rhythm-status", className: "rhythm-status mt-md" },
      `Round ${currentRound + 1} / ${roundsToWin}`),
    h("p", { id: "rhythm-instruction", className: "subtitle mt-sm" }, role === "hoplite"
      ? "Tap the sequence..."
      : "Watch the sequence..."),
    h("div", { id: "rhythm-pads", className: "rhythm-pads mt-lg" },
      ...COLORS.map((color) =>
        h("div", {
          id: `pad-${color}`,
          className: `rhythm-pad ${color}`,
          ...(role === "hoplite" ? { onClick: () => handlePadTap(color) } : {}),
        }, color)
      ),
    ),
    role === "hoplite"
      ? h(
          "div",
          { className: "mt-md flex-row gap-sm justify-center" },
          h("p", { id: "rhythm-taps", className: "subtitle" }, "Your taps: —"),
          h("button", {
            id: "rhythm-submit",
            className: "btn",
            onClick: handleSubmit,
          }, "Submit"),
        )
      : null,
    role === "oracle"
    ? h(
        "div",
        { className: "mt-md flex-row gap-sm justify-center" },
        h(
          "button",
          {
            id: "oracle-replay",
            className: "btn",
            onClick: () => {
              playSequence(currentSequence, (view.viewData.playbackSpeedMs as number) ?? 800);
            },
          },
          "Replay Sequence"
        )
      )
    : null,
    h("div", { id: "rhythm-players", className: "mt-sm" },
      h("p", { className: "subtitle" },
        `${data.playersReady as number} / ${data.totalPlayers as number} players ready`),
    ),
  );

  // Play the sequence for oracle player only
  if (role === "oracle") {
    setTimeout(() => playSequence(currentSequence, playbackSpeed), 1000);
  }
}

function playSequence(sequence: string[], speed: number): void {
  const instructionEl = $("#rhythm-instruction");
  if (instructionEl) instructionEl.textContent = "Watch carefully...";

  sequence.forEach((color, i) => {
    setTimeout(() => {
      flashPad(color);
    }, i * speed);
  });

  // After sequence finishes, enable input
  setTimeout(() => {
    if (instructionEl) instructionEl.textContent = "Guide your hoplite through the sequence";
  }, sequence.length * speed + 300);
}

function flashPad(color: string): void {
  const pad = $(`#pad-${color}`);
  if (!pad) return;
  pad.classList.add("flash", "active");
  setTimeout(() => pad.classList.remove("flash", "active"), 350);
}

function handlePadTap(color: string): void {
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
}

export function updateRhythmTap(view: PlayerView): void {
  const data = view.viewData as Record<string, unknown>;
  const currentRound = data.currentRound as number;
  const roundsToWin = data.roundsToWin as number;
  const hopliteSuccesses = data.hopliteSuccesses as number;
  const playersReady = data.playersReady as number;
  const totalPlayers = data.totalPlayers as number;

  let lastKnownRound = -1;
  const statusEl = $("#rhythm-status");
  if (statusEl) {
    statusEl.textContent =
      `Round ${currentRound + 1} / ${roundsToWin} — ` +
      `Your progress: ${hopliteSuccesses} / ${roundsToWin}`;
  }

  const playersEl = $("#rhythm-players");
  if (playersEl) {
    mount(playersEl,
      h("p", { className: "subtitle" }, `${playersReady} / ${totalPlayers} players ready`)
    );
  }

  // New round started
  if (currentRound !== lastKnownRound) {
    lastKnownRound = currentRound
    currentSequence = data.currentSequence as string[];
    playerTaps = [];

    const tapsEl = $("#rhythm-taps");
    if (tapsEl) tapsEl.textContent = "Your taps: —";
    if (view.role.toLowerCase() === "oracle") {
      setTimeout(() => {
        playSequence(currentSequence, (data.playbackSpeedMs as number) ?? 800);
      }, 1500);
    }
  }

  const submitBtn = $("#rhythm-submit") as HTMLButtonElement;
}
