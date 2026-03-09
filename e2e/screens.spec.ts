import { test, expect } from "@playwright/test";

test.describe("Screen Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should have all required screens in DOM", async ({ page }) => {
    // Check that all screens exist in the DOM
    const screens = [
      "#screen-lobby",
      "#screen-level-intro",
      "#screen-briefing",
      "#screen-puzzle",
      "#screen-results",
    ];

    for (const screenSelector of screens) {
      const screen = page.locator(screenSelector);
      await expect(screen).toBeAttached();
    }
  });

  test("should only have one active screen at a time", async ({ page }) => {
    const activeScreens = page.locator(".screen.active, [id^='screen-'].active");
    await expect(activeScreens).toHaveCount(1);
  });

  test("should have HUD element", async ({ page }) => {
    const hud = page.locator("#hud");
    await expect(hud).toBeAttached();
  });
});

test.describe("Game Flow Screens", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("lobby screen should have required elements", async ({ page }) => {
    const lobby = page.locator("#screen-lobby");
    
    // Check for common lobby elements
    await expect(lobby.locator("input").first()).toBeVisible();
    await expect(lobby.locator("button").first()).toBeVisible();
  });

  test("briefing screen should have required structure", async ({ page }) => {
    const briefing = page.locator("#screen-briefing");
    
    // Should have some content structure
    await expect(briefing).toBeAttached();
  });

  test("puzzle screen should have required structure", async ({ page }) => {
    const puzzle = page.locator("#screen-puzzle");
    
    // Should have puzzle container
    await expect(puzzle).toBeAttached();
  });

  test("results screen should have required structure", async ({ page }) => {
    const results = page.locator("#screen-results");
    
    // Should have results container
    await expect(results).toBeAttached();
  });
});
