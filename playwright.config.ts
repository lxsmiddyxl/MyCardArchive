import { defineConfig, devices } from "@playwright/test";

/**
 * Base URL for `page.goto` and the dev-server health check. Default loopback + 3000 so
 * Playwright, Next, and `reuseExistingServer` share one origin (avoids localhost vs
 * 127.0.0.1 on Windows).
 *
 * **Local**
 * - Default: Playwright runs `npm run dev:pw` and waits until `GET /api/health/ui` returns 200.
 * - Already running a dev server on the same origin? It is reused (`reuseExistingServer`).
 * - Use another port or an external URL: set `PLAYWRIGHT_BASE_URL` (e.g. `http://127.0.0.1:3001`).
 * - To only use a server you start yourself: `PLAYWRIGHT_SKIP_WEBSERVER=1` and set
 *   `PLAYWRIGHT_BASE_URL` to that server.
 *
 * **CI**
 * - `webServer` is off by default in CI (no surprise `next dev` cold compiles). Start the app
 *   (e.g. `npm run build` then `npm run start`) and set `PLAYWRIGHT_BASE_URL` + `PLAYWRIGHT_SKIP_WEBSERVER=1`.
 * - Or opt into Playwright-managed dev: `PLAYWRIGHT_START_WEBSERVER=1` (uses `npm run dev:pw`).
 *
 * Authenticated tests need `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`. Dual-account trade tests also
 * need `E2E_COUNTERPARTY_EMAIL` / `E2E_COUNTERPARTY_PASSWORD` (see `docs/runbooks/e2e-playwright.md`).
 */
const baseURL = (process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

const skipWebServer =
  process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1" || process.env.PLAYWRIGHT_SKIP_WEBSERVER === "true";

function webServerConfig():
  | {
      command: string;
      url: string;
      reuseExistingServer: boolean;
      timeout: number;
    }
  | undefined {
  if (skipWebServer) {
    return undefined;
  }

  const isCi = Boolean(process.env.CI);
  const startInCi = process.env.PLAYWRIGHT_START_WEBSERVER === "1";
  if (isCi && !startInCi) {
    return undefined;
  }

  return {
    command: "npm run dev:pw",
    // Lightweight JSON route — faster than waiting on the marketing HTML shell.
    url: `${baseURL}/api/health/ui`,
    reuseExistingServer: isCi ? false : true,
    timeout: 240_000,
  };
}

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
  webServer: webServerConfig(),
});
