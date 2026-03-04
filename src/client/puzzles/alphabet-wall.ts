import { h, $, mount, clear } from "../lib/dom.ts";
import { emit, ClientEvents } from "../lib/socket.ts";
import type { PlayerView } from "@shared/types.ts";

const ALPHABET = [
  ['Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ', 'Η', 'Θ', 'Ι'],
  ['Κ', 'Λ', 'Μ', 'Ν', 'Ξ', 'Ο', 'Π', 'Ρ', 'Σ'],
  ['Τ', 'Υ', 'Φ', 'Χ', 'Ψ', 'Ω']
];

export function renderAlphabetWall(container: HTMLElement, view: PlayerView): void {
  const data = view.viewData as Record<string, unknown>;
  const currentRound = data.currentRound as number;
  const totalRounds = data.totalRounds as number;

  mount(
    container,
    h("div", { className: "puzzle-header" },
      h("h2", { className: "title-lg" }, view.puzzleTitle),
      h("div", { className: "puzzle-role-badge" }, view.role),
    ),
    h("p", { id: "round-info", className: "subtitle mt-md" }, `Round ${currentRound} / ${totalRounds}`)
  );

  const mainArea = h("div", { className: "mt-lg alphabet-wall-container" });
  mount(container, mainArea);

  if (view.role === "Trapped") {
    renderTrappedView(mainArea, data);
  } else {
    renderWatcherView(mainArea, data);
  }
}

function renderTrappedView(container: HTMLElement, data: Record<string, unknown>): void {
  const currentWord = data.currentWord as string;
  const timeRemaining = Math.ceil((data.timeRemaining as number) / 1000);

  mount(
    container,
    h("div", { className: "flex-col items-center gap-md" },
      h("p", { className: "subtitle" }, "You are trapped in the Upside Down!"),
      h("div", { className: "target-word-display" },
        h("p", { className: "hud-label" }, "TARGET WORD"),
        h("h1", { className: "title-xl glow-text", id: "target-word" }, currentWord)
      ),
      h("p", { id: "timer-display", className: "hud-value" }, `Time: ${timeRemaining}s`),
      renderAlphabetKeyboard(true)
    )
  );
  
  startLocalTimer(data.timeRemaining as number);
}

function renderWatcherView(container: HTMLElement, data: Record<string, unknown>): void {
  const activeLetter = data.activeLetter as string | null;
  const wrongGuesses = (data.wrongGuesses as string[]) || [];
  const timeRemaining = Math.ceil((data.timeRemaining as number) / 1000);

  mount(
    container,
    h("div", { className: "flex-col items-center gap-md w-full" },
      h("p", { className: "subtitle" }, "Watch the lights and guess the word!"),
      h("p", { id: "timer-display", className: "hud-value" }, `Time: ${timeRemaining}s`),
      renderAlphabetKeyboard(false),
      
      h("div", { className: "mt-lg flex-col gap-sm items-center w-full", style: "max-width: 500px;" },
        h("input", {
          id: "guess-input",
          className: "input guess-input",
          type: "text",
          placeholder: "Type your guess here...",
          autocomplete: "off",
          style: "text-align: center; letter-spacing: 2px;",
        }),
        h("button", {
          id: "guess-submit",
          className: "btn btn-primary",
          onClick: handleGuessSubmit,
        }, "Submit Guess"),
      ),

      h("div", { id: "wrong-guesses-container", className: "mt-md" },
        ...wrongGuesses.map(g => h("p", { className: "subtitle text-error" }, `✗ ${g}`))
      )
    )
  );

  const input = $("#guess-input") as HTMLInputElement;
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleGuessSubmit();
    });
    input.focus();
  }

  updateAlphabetGlow(activeLetter);
  startLocalTimer(data.timeRemaining as number);
}

function renderAlphabetKeyboard(interactive: boolean): HTMLElement {
  return h("div", { id: "alphabet-keyboard", className: "alphabet-keyboard mt-md" },
    ...ALPHABET.map(row => 
      h("div", { className: "alphabet-row" },
        ...row.map(letter => {
          const btn = h("div", { 
            className: `alphabet-key ${interactive ? 'interactive' : ''}`, 
            id: `key-${letter}` 
          }, letter);
          
          if (interactive) {
            btn.addEventListener("click", () => handleLetterClick(letter));
          }
          return btn;
        })
      )
    )
  );
}

let lastLetterClick = 0;
function handleLetterClick(letter: string): void {
  const now = Date.now();
  if (now - lastLetterClick < 800) return; // Client-side cooldown debounce
  lastLetterClick = now;

  emit(ClientEvents.PUZZLE_ACTION, {
    puzzleId: "",
    action: "send_letter",
    data: { letter },
  });
  
  // Apply a small local visual feedback
  const keyEl = $(`#key-${letter}`);
  if (keyEl) {
    keyEl.classList.add("lit-local");
    setTimeout(() => keyEl.classList.remove("lit-local"), 300);
  }
}

function handleGuessSubmit(): void {
  const input = $("#guess-input") as HTMLInputElement;
  if (!input || !input.value.trim()) return;

  emit(ClientEvents.PUZZLE_ACTION, {
    puzzleId: "",
    action: "submit_guess",
    data: { guess: input.value.trim() },
  });

  input.value = "";
}

function updateAlphabetGlow(activeLetter: string | null): void {
  const keys = document.querySelectorAll(".alphabet-key");
  keys.forEach(k => k.classList.remove("lit"));
  
  if (activeLetter) {
    const activeKey = $(`#key-${activeLetter}`);
    if (activeKey) {
      activeKey.classList.add("lit");
    }
  }
}

let timerInterval: number | null = null;
let currentTimeoutMs: number = 0;

function startLocalTimer(timeRemainingMs: number): void {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
  }
  
  currentTimeoutMs = timeRemainingMs;
  
  const updateDisplay = () => {
    const display = $("#timer-display");
    if (display) {
      display.textContent = `Time: ${Math.ceil(currentTimeoutMs / 1000)}s`;
    }
  };
  
  updateDisplay();
  
  timerInterval = window.setInterval(() => {
    currentTimeoutMs -= 1000;
    if (currentTimeoutMs <= 0) {
      currentTimeoutMs = 0;
      if (timerInterval !== null) clearInterval(timerInterval);
      
      // Emit timeout from client side (just one client ideally, but server handles dupes gracefully)
      // Since it's MVP and anyone firing it is fine.
      emit(ClientEvents.PUZZLE_ACTION, {
        puzzleId: "",
        action: "timeout",
        data: {},
      });
    }
    updateDisplay();
  }, 1000);
}

export function updateAlphabetWall(view: PlayerView): void {
  const data = view.viewData as Record<string, unknown>;
  const currentRound = data.currentRound as number;
  const totalRounds = data.totalRounds as number;

  const roundInfo = $("#round-info");
  if (roundInfo) roundInfo.textContent = `Round ${currentRound} / ${totalRounds}`;

  if (view.role === "Trapped") {
    const wordEl = $("#target-word");
    if (wordEl && wordEl.textContent !== data.currentWord) {
      wordEl.textContent = data.currentWord as string;
      // Also sync timer if round changed
      startLocalTimer(data.timeRemaining as number);
    }
  } else {
    updateAlphabetGlow(data.activeLetter as string | null);
    
    // Check if we need to reset timer due to new round
    if (data.timeRemaining && Math.abs(currentTimeoutMs - (data.timeRemaining as number)) > 2000) {
      startLocalTimer(data.timeRemaining as number);
    }

    const wrongGuesses = (data.wrongGuesses as string[]) || [];
    const wrongGuessesContainer = $("#wrong-guesses-container");
    if (wrongGuessesContainer) {
      clear(wrongGuessesContainer);
      wrongGuesses.forEach(g => {
        const p = document.createElement("p");
        p.className = "subtitle text-error";
        p.textContent = `✗ ${g}`;
        wrongGuessesContainer.appendChild(p);
      });
    }
  }
}
