import { test as base, expect, type Page } from "@playwright/test";

export { expect };

export const hasEnvCredentials = () =>
  Boolean(process.env.E2E_TEST_EMAIL?.trim() && process.env.E2E_TEST_PASSWORD?.trim());

/** Counterparty account for dual-user trade flows (`tests/e2e/trades-dual-account.spec.ts`). */
export const hasDualAccountCredentials = () =>
  hasEnvCredentials() &&
  Boolean(process.env.E2E_COUNTERPARTY_EMAIL?.trim() && process.env.E2E_COUNTERPARTY_PASSWORD?.trim());

export async function loginAsUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 45_000 });
}

/** Clears cookies so the next `loginAsUser` round-trips another account in the same context. */
export async function clearBrowserSession(page: Page): Promise<void> {
  await page.context().clearCookies();
}

/**
 * Reads `auth.users.id` for the signed-in user from the “Open public profile” link on `/profile`.
 */
export async function readSelfUserIdFromProfile(page: Page): Promise<string | null> {
  await page.goto("/profile");
  const link = page.getByRole("link", { name: /open public profile/i });
  await link.waitFor({ state: "visible", timeout: 25_000 });
  const href = await link.getAttribute("href");
  const m = /^\/profile\/([^/?#]+)/.exec(href ?? "");
  return m?.[1] ?? null;
}

/**
 * Logs in via `/login` using `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD`.
 * Throws if credentials are missing (callers should skip first).
 */
export async function loginAsTestUser(page: Page): Promise<void> {
  const email = process.env.E2E_TEST_EMAIL?.trim();
  const password = process.env.E2E_TEST_PASSWORD?.trim();
  if (!email || !password) {
    throw new Error("Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD for authenticated E2E tests.");
  }
  await loginAsUser(page, email, password);
}

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use, testInfo) => {
    if (!hasEnvCredentials()) {
      testInfo.skip(true, "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD for authenticated flows.");
      return;
    }
    await loginAsTestUser(page);
    await use(page);
  },
});
