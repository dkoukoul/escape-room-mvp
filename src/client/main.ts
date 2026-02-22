// ============================================================
// Main Entry Point — Project ODYSSEY Client
// ============================================================

import { connect, on, emit, ServerEvents } from "./lib/socket.ts";
import { showScreen, showHUD } from "./lib/router.ts";
import { preloadSounds, playGlitchHit, playTick, resumeContext } from "./audio/audio-manager.ts";
import { $ } from "./lib/dom.ts";
import type { 
  GlitchUpdatePayload, 
  TimerUpdatePayload, 
  PhaseChangePayload, 
  PuzzleCompletedPayload,
  GameStartedPayload 
} from "@shared/events.ts";
import { ClientEvents } from "@shared/events.ts";
import { 
  playBackgroundMusic, 
  stopBackgroundMusic, 
  toggleMute, 
  getMuteState 
} from "./audio/audio-manager.ts";
import { applyTheme, removeTheme } from "./lib/theme-engine.ts";

let activeBackgroundMusic: string | null = null;
import { initLobby } from "./screens/lobby.ts";
import { initLevelIntro } from "./screens/level-intro.ts";
import { initBriefing } from "./screens/briefing.ts";
import { initPuzzleScreen } from "./screens/puzzle.ts";
import { initResults } from "./screens/results.ts";

// ---- Boot ----
async function boot() {
  // ---- Global resume on first interaction ----
  const resume = () => {
    resumeContext();
    window.removeEventListener("mousedown", resume);
    window.removeEventListener("keydown", resume);
  };
  window.addEventListener("mousedown", resume);
  window.addEventListener("keydown", resume);

  console.log("⚡ Project ODYSSEY — Cyber-Hoplite Protocol");
  console.log("   Initializing systems...");

  // Connect to server
  connect();

  // Preload audio (failures are silent)
  await preloadSounds();

  // Initialize screens
  initLobby();
  initLevelIntro();
  initBriefing();
  initPuzzleScreen();
  initResults();

  // ---- Mute Toggle ----
  const muteBtn = $("#hud-mute-btn");
  if (muteBtn) {
    const updateIcon = (muted: boolean) => {
      muteBtn.textContent = muted ? "🔇" : "🔊";
      muteBtn.classList.toggle("muted", muted);
    };
    
    updateIcon(getMuteState());
    
    muteBtn.onclick = () => {
      const isMuted = toggleMute();
      updateIcon(isMuted);
    };
  }

  // ---- Global HUD updates ----

  // Timer updates
  on(ServerEvents.TIMER_UPDATE, (data: TimerUpdatePayload) => {
    const { remainingSeconds } = data.timer;
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const timerEl = $("#hud-timer-value");
    if (timerEl) {
      timerEl.textContent = `${minutes}:${String(seconds).padStart(2, "0")}`;
    }

    // Color warning when low time
    if (remainingSeconds <= 60) {
      timerEl?.style.setProperty("color", "var(--neon-red)");
      if (remainingSeconds <= 10) playTick();
    }
  });

  // Glitch updates
  on(ServerEvents.GLITCH_UPDATE, (data: GlitchUpdatePayload) => {
    const { value, maxValue } = data.glitch;
    const percent = (value / maxValue) * 100;

    // Update HUD bar
    const fill = $("#hud-glitch-fill");
    if (fill) fill.style.width = `${percent}%`;

    // Update CSS glitch intensity
    const intensity = value / maxValue;
    document.documentElement.style.setProperty("--glitch-intensity", String(intensity));

    // Screen shake on glitch increase
    if (intensity > 0.1) {
      const app = $("#app");
      if (app) {
        app.classList.add("screen-shake");
        setTimeout(() => app.classList.remove("screen-shake"), 300);
      }
      playGlitchHit();
    }
  });

  // Phase changes
  on(ServerEvents.PHASE_CHANGE, (data: PhaseChangePayload) => {
    // Update puzzle progress in HUD
    const progressEl = $("#hud-progress-value");
    if (progressEl) progressEl.textContent = `${data.puzzleIndex + 1}/5`;

    // Play background music when first puzzle starts (if not already playing)
    if (data.phase === "playing" && activeBackgroundMusic) {
      playBackgroundMusic(activeBackgroundMusic);
    }
    
    // Stop music and remove theme on game end
    if (data.phase === "victory" || data.phase === "defeat" || data.phase === "lobby") {
      stopBackgroundMusic();
      activeBackgroundMusic = null;
      removeTheme();
    }
  });

  // Handle game start to store music and apply theme
  on(ServerEvents.GAME_STARTED, (data: GameStartedPayload) => {
    if (data.backgroundMusic) {
      activeBackgroundMusic = data.backgroundMusic;
    }
    if (data.themeCss) {
      applyTheme(data.themeCss);
    }
  });

  // Puzzle completed
  on(ServerEvents.PUZZLE_COMPLETED, (_data: PuzzleCompletedPayload) => {
    // Brief celebration effect
    const app = $("#app");
    if (app) {
      app.style.transition = "filter 0.5s ease";
      app.style.filter = "brightness(1.3) saturate(1.5)";
      setTimeout(() => {
        app.style.filter = "";
      }, 800);
    }
  });

  // Start on lobby
  showScreen("lobby");
  showHUD(false);

  // ---- Dev Tools ----
  (window as any).jumpToPuzzle = (index: number) => {
    emit(ClientEvents.JUMP_TO_PUZZLE, { puzzleIndex: index });
    console.log(`[Dev] Jumping to puzzle index: ${index}`);
  };

  console.log("   Systems online. Ready for deployment.");

}

// ---- Start ----
boot().catch(console.error);
