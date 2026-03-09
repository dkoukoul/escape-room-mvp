import { describe, it, expect, beforeEach, vi } from "vitest";
import { applyTheme, removeTheme } from "./theme-engine.ts";

// Mock logger
vi.mock("@client/logger.ts", () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Theme Engine", () => {
  beforeEach(() => {
    // Clean up any theme links from previous tests
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  describe("applyTheme()", () => {
    it("should create link elements for each CSS path", () => {
      applyTheme(["themes/test-theme.css"]);
      
      const links = document.querySelectorAll('link[data-theme="level"]');
      expect(links.length).toBe(1);
    });

    it("should create multiple link elements for multiple paths", () => {
      applyTheme([
        "themes/theme1.css",
        "themes/theme2.css",
        "components/custom.css",
      ]);
      
      const links = document.querySelectorAll('link[data-theme="level"]');
      expect(links.length).toBe(3);
    });

    it("should set correct attributes on link elements", () => {
      applyTheme(["themes/cyberpunk.css"]);
      
      const link = document.querySelector('link[data-theme="level"]') as HTMLLinkElement;
      expect(link).not.toBeNull();
      expect(link.rel).toBe("stylesheet");
      expect(link.href).toContain("/styles/themes/cyberpunk.css");
    });

    it("should append links to document head", () => {
      applyTheme(["themes/test.css"]);
      
      const link = document.head.querySelector('link[data-theme="level"]');
      expect(link).not.toBeNull();
    });

    it("should remove existing theme before applying new one", () => {
      applyTheme(["themes/old.css"]);
      applyTheme(["themes/new.css"]);
      
      const links = document.querySelectorAll('link[data-theme="level"]');
      expect(links.length).toBe(1);
      expect(links[0]?.getAttribute("href")).toContain("new.css");
    });

    it("should handle empty array gracefully", () => {
      // Should not throw
      expect(() => applyTheme([])).not.toThrow();
      
      const links = document.querySelectorAll('link[data-theme="level"]');
      expect(links.length).toBe(0);
    });
  });

  describe("removeTheme()", () => {
    it("should remove all theme link elements", () => {
      applyTheme(["themes/theme1.css", "themes/theme2.css"]);
      
      removeTheme();
      
      const links = document.querySelectorAll('link[data-theme="level"]');
      expect(links.length).toBe(0);
    });

    it("should handle no theme applied gracefully", () => {
      // Should not throw when no theme exists
      expect(() => removeTheme()).not.toThrow();
    });

    it("should allow applying theme after removal", () => {
      applyTheme(["themes/theme1.css"]);
      removeTheme();
      applyTheme(["themes/theme2.css"]);
      
      const links = document.querySelectorAll('link[data-theme="level"]');
      expect(links.length).toBe(1);
      expect(links[0]?.getAttribute("href")).toContain("theme2.css");
    });
  });

  describe("integration", () => {
    it("should handle multiple apply/remove cycles", () => {
      applyTheme(["themes/a.css"]);
      removeTheme();
      applyTheme(["themes/b.css", "themes/c.css"]);
      removeTheme();
      applyTheme(["themes/d.css"]);
      
      const links = document.querySelectorAll('link[data-theme="level"]');
      expect(links.length).toBe(1);
      expect(links[0]?.getAttribute("href")).toContain("d.css");
    });
  });
});
