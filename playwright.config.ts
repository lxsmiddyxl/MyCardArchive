import { defineConfig, devices } from "@playwright/test";

/**
 * Default to loopback so Playwright, Next, and `reuseExistingServer` agree on one
 * origin (avoids localhost vs 127.0.0.1 mismatch on Windows).
 *
 * Authenticated tests (`tests/e2e/authenticated.spec.ts`) require:
 * `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` for a valid Supabase user in the target env.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev:pw",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
