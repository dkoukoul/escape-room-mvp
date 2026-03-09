import { defineConfig } from "vitest/config";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    // Use happy-dom for DOM testing (faster than jsdom)
    environment: "happy-dom",
    // Include client tests
    include: ["src/client/**/*.test.ts"],
    // Exclude e2e tests (those are handled by Playwright)
    exclude: ["node_modules", "dist", "e2e"],
    // Global test setup
    globals: true,
    setupFiles: ["./src/client/__tests__/setup.ts"],
    // Mock imports
    mockReset: true,
    restoreMocks: true,
    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage/client",
      include: ["src/client/**/*.ts"],
      exclude: [
        "src/client/**/*.test.ts",
        "src/client/**/*.d.ts",
        "src/client/types/**",
        "src/client/__tests__/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "shared"),
      "@client": resolve(__dirname, "src/client"),
    },
  },
});
