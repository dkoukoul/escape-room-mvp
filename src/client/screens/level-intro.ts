// ============================================================
// Level Intro Screen — Narrative story + Audio intro
// ============================================================

import { h, $, mount } from "../lib/dom.ts";
import { on, emit, ServerEvents, ClientEvents } from "../lib/socket.ts";
import { showScreen } from "../lib/router.ts";
import type { GameStartedPayload } from "@shared/events.ts";
import { playSound, playAudioFile, playTypewriterClick } from "../audio/audio-manager.ts";

export function initLevelIntro(): void {
  on(ServerEvents.GAME_STARTED, (data: GameStartedPayload) => {
    renderLevelIntro(data);
  });
}

async function renderLevelIntro(data: GameStartedPayload): Promise<void> {
  const screen = $("#screen-level-intro")!;
  showScreen("level-intro");

  const storyEl = h("p", {
    className: "subtitle",
    style: "max-width: 650px; line-height: 1.8; font-size: 1.1rem; white-space: pre-wrap; margin-top: 2rem;",
  });

  mount(
    screen,
    h("div", { className: "panel flex-col items-center gap-md text-center fade-in", style: "max-width: 800px;" },
      h("h1", { className: "title-lg mt-sm glitch-text", "data-text": data.levelTitle }, data.levelTitle),
      h("div", { className: "mt-lg", style: "border-top: 1px solid var(--neon-cyan); padding-top: var(--space-md); position: relative;" },
        h("div", {
          style: "position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: var(--bg-black); padding: 0 10px; font-family: 'Share Tech Mono'; color: var(--neon-cyan); font-size: 0.7rem;",
        }, "MISSION BRIEFING"),
        storyEl,
      ),
      h("p", {
        id: "intro-status",
        className: "subtitle pulse mt-xl",
        style: "font-size: 0.9rem; color: var(--neon-cyan);",
      }, "Synchronizing transmission..."),
    ),
  );

  // Start typewriter effect (don't await so audio starts too)
  typewriterEffect(storyEl, data.levelStory.trim());

  // Play audio
  const statusEl = $("#intro-status");
  if (statusEl) statusEl.textContent = "Incoming Audio Stream...";

  if (data.levelIntroAudio) {
    try {
      // We await the audio completion so we know when to move to the next phase
      await playAudioFile(data.levelIntroAudio);
      completeIntro();
    } catch (err) {
      console.warn("[Intro] Audio failed to play, skipping...");
      setTimeout(completeIntro, 2000);
    }
  } else {
    // No audio, just wait a bit for the typewriter
    setTimeout(completeIntro, 5000);
  }
}

function completeIntro() {
  const statusEl = $("#intro-status");
  if (statusEl) statusEl.textContent = "Transmission complete. Stand by...";
  
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
        
        if (text[index] !== ' ' && text[index] !== '\n') {
          playTypewriterClick();
        }
        
        index++;
      } else {
        clearInterval(timer);
        resolve();
      }
    }, 20); // Slightly faster for long stories
  });
}
