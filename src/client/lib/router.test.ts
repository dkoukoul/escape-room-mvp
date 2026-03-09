import { describe, it, expect, beforeEach, vi } from "vitest";
import { showScreen, getCurrentScreen, showHUD, type ScreenName } from "./router.ts";
import type { GlitchState } from "@shared/types.ts";

// Mock visual-fx module
const mockStartRandomFX = vi.fn();
const mockStopRandomFX = vi.fn();

vi.mock("./visual-fx.ts", () => ({
  startRandomFX: (...args: any[]) => mockStartRandomFX(...args),
  stopRandomFX: (...args: any[]) => mockStopRandomFX(...args),
}));

// Mock logger
vi.mock("@client/logger.ts", () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Router", () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div id="screen-lobby" class="screen"></div>
      <div id="screen-level-intro" class="screen"></div>
      <div id="screen-briefing" class="screen"></div>
      <div id="screen-puzzle" class="screen"></div>
      <div id="screen-results" class="screen"></div>
      <div id="hud" class="hidden"></div>
    `;
    
    // Reset mocks
    vi.clearAllMocks();
  });

  describe("showScreen()", () => {
    it("should show lobby screen by default", () => {
      const lobby = document.getElementById("screen-lobby");
      expect(lobby?.classList.contains("active")).toBe(false);
      
      showScreen("lobby");
      expect(lobby?.classList.contains("active")).toBe(true);
    });

    it("should switch between screens", () => {
      showScreen("lobby");
      expect(document.getElementById("screen-lobby")?.classList.contains("active")).toBe(true);
      
      showScreen("briefing");
      expect(document.getElementById("screen-lobby")?.classList.contains("active")).toBe(false);
      expect(document.getElementById("screen-briefing")?.classList.contains("active")).toBe(true);
    });

    it("should handle non-existent screens gracefully", () => {
      document.body.innerHTML = '<div id="screen-lobby"></div>';
      
      // Should not throw
      expect(() => showScreen("briefing" as ScreenName)).not.toThrow();
    });

    it("should start visual FX for puzzle screen with glitch", () => {
      const glitchState: GlitchState = {
        name: "matrix-glitch",
        value: 50,
        maxValue: 100,
        decayRate: 1,
      };
      
      showScreen("puzzle", glitchState);
      
      expect(mockStartRandomFX).toHaveBeenCalledWith(["matrix-glitch"]);
    });

    it("should stop visual FX when leaving puzzle screen", () => {
      const glitchState: GlitchState = {
        name: "matrix-glitch",
        value: 50,
        maxValue: 100,
        decayRate: 1,
      };
      
      showScreen("puzzle", glitchState);
      showScreen("lobby");
      
      expect(mockStopRandomFX).toHaveBeenCalled();
    });

    it("should not start FX for non-puzzle screens", () => {
      showScreen("lobby");
      showScreen("briefing");
      showScreen("results");
      
      expect(mockStartRandomFX).not.toHaveBeenCalled();
    });
  });

  describe("getCurrentScreen()", () => {
    it("should return current screen", () => {
      // The initial screen depends on module state from other tests
      // Just verify it returns a valid screen name
      const current = getCurrentScreen();
      expect(["lobby", "level-intro", "briefing", "puzzle", "results"]).toContain(current);
    });

    it("should return current screen after switch", () => {
      showScreen("briefing");
      expect(getCurrentScreen()).toBe("briefing");
      
      showScreen("puzzle");
      expect(getCurrentScreen()).toBe("puzzle");
    });
  });

  describe("showHUD()", () => {
    it("should show HUD when true", () => {
      showHUD(true);
      const hud = document.getElementById("hud");
      expect(hud?.classList.contains("hidden")).toBe(false);
    });

    it("should hide HUD when false", () => {
      showHUD(true);
      showHUD(false);
      const hud = document.getElementById("hud");
      expect(hud?.classList.contains("hidden")).toBe(true);
    });

    it("should handle missing HUD element gracefully", () => {
      document.body.innerHTML = "";
      
      // Should not throw
      expect(() => showHUD(true)).not.toThrow();
      expect(() => showHUD(false)).not.toThrow();
    });
  });
});
