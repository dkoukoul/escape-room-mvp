import { test, expect } from "@playwright/test";

test.describe("Lobby Page", () => {
  test.beforeEach(async ({ page }) => {
    // Capture console errors for debugging
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.log(`[Browser Console Error]: ${msg.text()}`);
      }
    });
    page.on("pageerror", (err) => {
      console.log(`[Browser Page Error]: ${err.message}`);
    });
    await page.goto("/");
    // Wait for the app to initialize
    await page.waitForSelector("#app", { timeout: 10000 });
  });

  test("should display lobby screen on initial load", async ({ page }) => {
    // Check that the lobby screen is visible
    const lobbyScreen = page.locator("#screen-lobby");
    await expect(lobbyScreen).toHaveClass(/active/);
  });

  test("should have project title", async ({ page }) => {
    // Check for the game title
    await expect(page.locator("text=ODYSSEY")).toBeVisible();
  });

  test("should have create room button", async ({ page }) => {
    const createButton = page.locator("button:has-text('Create Room'), button:has-text('Δημιουργία')");
    await expect(createButton).toBeVisible();
  });

  test("should have join room section", async ({ page }) => {
    // Look for join room input or button
    const joinInput = page.locator("input[placeholder*='room' i], input[placeholder*='κωδικός' i]");
    const joinButton = page.locator("button:has-text('Join'), button:has-text('Συμμετοχή')");
    
    // At least one of these should exist
    await expect(joinInput.or(joinButton)).toBeVisible();
  });

  test("should allow entering player name", async ({ page }) => {
    // Look for name input
    const nameInput = page.locator("input[type='text']").first();
    await nameInput.fill("TestPlayer");
    await expect(nameInput).toHaveValue("TestPlayer");
  });
});

test.describe("Room Creation Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should create a room and show room code", async ({ page }) => {
    // Fill in player name
    const nameInput = page.locator("input[type='text']").first();
    await nameInput.fill("HostPlayer");

    // Click create room button
    const createButton = page.locator("button:has-text('Create Room'), button:has-text('Δημιουργία')");
    await createButton.click();

    // Wait for room creation (this may take a moment)
    await page.waitForTimeout(2000);

    // Check if room code is displayed somewhere
    const roomCode = page.locator("[data-testid='room-code'], .room-code, text=/[A-Z0-9]{4,6}/");
    
    // The UI might transition to a waiting room or show the code
    await expect(roomCode.or(page.locator("text=waiting").or(page.locator("text=Waiting")))).toBeVisible();
  });
});

test.describe("Navigation and UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should have responsive layout", async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    const lobbyScreen = page.locator("#screen-lobby");
    await expect(lobbyScreen).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(lobbyScreen).toBeVisible();
  });

  test("should have no console errors on load", async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Allow some time for any errors to appear
    await page.waitForTimeout(1000);

    expect(consoleErrors).toHaveLength(0);
  });
});
