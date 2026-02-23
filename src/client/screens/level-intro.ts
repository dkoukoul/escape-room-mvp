// ============================================================
// Level Intro Screen — Narrative story + Audio intro
// ============================================================

import { h, $, mount } from "../lib/dom.ts";
import { on, emit, ServerEvents, ClientEvents } from "../lib/socket.ts";
import { showScreen } from "../lib/router.ts";
import type { GameStartedPayload } from "@shared/events.ts";
import { playSound, playAudioFile, playTypewriterClick, loadSound } from "../audio/audio-manager.ts";

export function initLevelIntro(): void {
  on(ServerEvents.GAME_STARTED, (data: GameStartedPayload) => {
    renderLevelIntro(data);
  });
}

async function renderLevelIntro(data: GameStartedPayload): Promise<void> {
  const screen = $("#screen-level-intro")!;
  showScreen("level-intro");

  const storyEl = h("p", {
    className: "story-text",
    style: "max-width: 650px; line-height: 1.8; font-size: 1.1rem; white-space: pre-wrap; margin-top: 2rem;",
  });

  const continueBtn = h("button", {
    className: "btn btn-primary mt-xl fade-in",
    style: "display: none; padding: 1rem 3rem; font-size: 1.2rem;",
    onclick: () => {
      completeIntro();
      continueBtn.classList.add("disabled");
      (continueBtn as HTMLButtonElement).disabled = true;
      continueBtn.textContent = "WAITING FOR CREW...";
    }
  }, "INITIALIZE MISSION");

  mount(
    screen,
    h("div", { className: "panel level-intro-panel flex-col items-center gap-md text-center fade-in", style: "max-width: 800px; position: relative;" },
      h("div", { className: "mission-brand" }, "System Narrative Protocol"),
      h("h1", { className: "title-lg mt-sm glitch-text", "data-text": data.levelTitle, style: "font-size: 2.5rem;" }, data.levelTitle),
      h("div", { className: "mt-lg", style: "border-top: 1px solid var(--neon-cyan); padding-top: var(--space-md); position: relative; width: 100%;" },
        h("div", {
          style: "position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: var(--bg-black); padding: 0 10px; font-family: 'Share Tech Mono'; color: var(--neon-cyan); font-size: 0.7rem; letter-spacing: 2px;",
        }, "MISSION SYNC"),
        storyEl,
      ),
      h("p", {
        id: "intro-status",
        className: "status-line pulse mt-xl",
      }, "Synchronizing transmission..."),
      continueBtn
    ),
  );

  const statusEl = $("#intro-status");

  // Parallel execution of typewriter and audio
  const typewriterPromise = typewriterEffect(storyEl, data.levelStory.trim());
  
  let audioPromise = Promise.resolve();
  if (data.levelIntroAudio) {
    const audioUrl = data.levelIntroAudio;
    audioPromise = (async () => {
       try {
        await loadSound(audioUrl);
        if (statusEl) statusEl.textContent = "Incoming Audio Stream...";
        await playAudioFile(audioUrl);
      } catch (err) {
        console.warn("[Intro] Audio failed:", err);
      }
    })();
  }

  // Wait for both to finish (or at least the typewriter if audio fails/is missing)
  await Promise.all([typewriterPromise, audioPromise]);

  // Show the continue button after both are done
  if (statusEl) {
    statusEl.textContent = "Transmission complete. Awaiting manual override.";
    statusEl.classList.remove("pulse");
  }
  continueBtn.style.display = "block";
}

function completeIntro() {
  // Tell server we are done
  emit(ClientEvents.INTRO_COMPLETE);
}

async function typewriterEffect(el: HTMLElement, text: string): Promise<void> {
  let index = 0;
  el.textContent = "";

  return new Promise((resolve) => {
    const timer = setInterval(() => {
      if (index < text.length) {
        el.textContent += text[index];
        
        // Randomize click sound slightly
        if (Math.random() > 0.3) playTypewriterClick();
        
        index++;
      } else {
        clearInterval(timer);
        resolve();
      }
    }, 25);
  });
}
