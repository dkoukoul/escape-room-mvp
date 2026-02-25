// ============================================================
// Briefing Screen — Story text with typewriter animation
// ============================================================

import { h, $, mount } from "../lib/dom.ts";
import { on, emit, ServerEvents, ClientEvents } from "../lib/socket.ts";
import { showScreen } from "../lib/router.ts";
import type { BriefingPayload, PlayerReadyUpdatePayload } from "@shared/events.ts";
import { playBriefingIntro, playTypewriterClick, stopAllActiveAudio } from "../audio/audio-manager.ts";

let typewriterTimer: ReturnType<typeof setInterval> | null = null;
let readyButtonEl: HTMLButtonElement | null = null;
let isPlayerReady = false;
let isSkipping = false;

export function initBriefing(): void {
  on(ServerEvents.BRIEFING, (data: BriefingPayload) => {
    isPlayerReady = false;
    isSkipping = false;
    renderBriefing(data);
  });

  on(ServerEvents.PLAYER_READY_UPDATE, (data: PlayerReadyUpdatePayload) => {
    if (readyButtonEl && isPlayerReady) {
      readyButtonEl.textContent = `WAITING FOR OTHERS (${data.readyCount}/${data.totalPlayers})`;
    }
  });
}

function renderBriefing(data: BriefingPayload): void {
  const screen = $("#screen-briefing")!;
  showScreen("briefing");

  const textEl = h("p", {
    id: "briefing-text",
    className: "subtitle",
    style: "max-width: 600px; line-height: 1.8; min-height: 100px; font-size: 1rem;",
  });

  const readyBtn = h("button", {
    className: "btn btn-primary mt-lg fade-in px-lg py-sm",
    style: "display: none; font-size: 1.2rem; min-width: 250px;",
    onclick: () => {
      if (!isPlayerReady) {
        isPlayerReady = true;
        playTypewriterClick(); // Click sound
        emit(ClientEvents.PLAYER_READY);
        if (readyButtonEl) {
          readyButtonEl.textContent = "WAITING FOR OTHERS...";
          readyButtonEl.classList.add("disabled");
          readyButtonEl.style.opacity = "0.7";
          readyButtonEl.style.pointerEvents = "none";
        }
      }
    }
  }, "READY");
  
  readyButtonEl = readyBtn as HTMLButtonElement;

  const skipBtn = h("button", {
    className: "btn btn-outline",
    style: "position: absolute; bottom: 20px; right: 20px; font-size: 0.7rem; opacity: 0.5; border-color: rgba(0, 240, 255, 0.3);",
    onclick: () => {
      isSkipping = true;
      stopAllActiveAudio();
      skipBtn.style.display = "none";
    }
  }, "SKIP SEQUENCE [SPACE]");

  // Add spacebar listener for skipping
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Space" && skipBtn.style.display !== "none") {
      skipBtn.click();
    }
  };
  window.addEventListener("keydown", handleKeyDown, { once: true });

  mount(
    screen,
    h("div", { className: "panel flex-col items-center gap-md text-center fade-in", style: "max-width: 700px; position: relative;" },
      h("p", { className: "subtitle" }, `MISSION ${data.puzzleIndex + 1} / ${data.totalPuzzles}`),
      h("h2", { className: "title-lg mt-sm" }, data.puzzleTitle),
      h("div", { className: "mt-lg", style: "border-left: 2px solid var(--neon-cyan); padding-left: var(--space-md);" },
        textEl,
      ),
      h("p", {
        id: "briefing-status",
        className: "subtitle pulse mt-lg",
        style: "font-size: 0.8rem;",
      }, "Incoming transmission..."),
      readyBtn,
      skipBtn
    ),
  );

  // Typewriter effect
  typewriterEffect(textEl, data.briefingText.trim(), readyBtn, () => {
     const statusEl = $("#briefing-status");
     if (statusEl) statusEl.style.display = "none";
     skipBtn.style.display = "none";
     window.removeEventListener("keydown", handleKeyDown);
  });
}

function typewriterEffect(el: HTMLElement, text: string, readyBtn: HTMLElement, onComplete: () => void): void {
  if (typewriterTimer) clearInterval(typewriterTimer);

  let index = 0;
  el.textContent = "";

  typewriterTimer = setInterval(() => {
    if (isSkipping) {
        el.textContent = text;
        clearInterval(typewriterTimer!);
        readyBtn.style.display = "block";
        onComplete();
        return;
    }

    if (index < text.length) {
      el.textContent += text[index];
      
      // Play a quick, slightly randomized high-pitched click for a cyberpunk feel
      playTypewriterClick();

      index++;
    } else {
      if (typewriterTimer) clearInterval(typewriterTimer);
      // Show ready button when transmission finishes
      readyBtn.style.display = "block";
      onComplete();
    }
  }, 25);
}
