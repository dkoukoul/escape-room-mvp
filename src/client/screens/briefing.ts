// ============================================================
// Briefing Screen — Story text with typewriter animation
// ============================================================

import { h, $, mount } from "../lib/dom.ts";
import { on, ServerEvents } from "../lib/socket.ts";
import { showScreen } from "../lib/router.ts";
import type { BriefingPayload } from "@shared/events.ts";

let typewriterTimer: ReturnType<typeof setInterval> | null = null;

export function initBriefing(): void {
  on(ServerEvents.BRIEFING, (data: BriefingPayload) => {
    renderBriefing(data);
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

  mount(
    screen,
    h("div", { className: "panel flex-col items-center gap-md text-center fade-in", style: "max-width: 700px;" },
      h("p", { className: "subtitle" }, `MISSION ${data.puzzleIndex + 1} / ${data.totalPuzzles}`),
      h("h2", { className: "title-lg mt-sm" }, data.puzzleTitle),
      h("div", { className: "mt-lg", style: "border-left: 2px solid var(--neon-cyan); padding-left: var(--space-md);" },
        textEl,
      ),
      h("p", {
        className: "subtitle pulse mt-lg",
        style: "font-size: 0.8rem;",
      }, "Incoming transmission..."),
    ),
  );

  // Typewriter effect
  typewriterEffect(textEl, data.briefingText.trim());
}

function typewriterEffect(el: HTMLElement, text: string): void {
  if (typewriterTimer) clearInterval(typewriterTimer);

  let index = 0;
  el.textContent = "";

  typewriterTimer = setInterval(() => {
    if (index < text.length) {
      el.textContent += text[index];
      index++;
    } else {
      if (typewriterTimer) clearInterval(typewriterTimer);
    }
  }, 25);
}
