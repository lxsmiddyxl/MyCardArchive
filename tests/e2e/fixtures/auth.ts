import { test as base, expect, type Page } from "@playwright/test";

export { expect };

export const hasEnvCredentials = () =>
  Boolean(process.env.E2E_TEST_EMAIL?.trim() && process.env.E2E_TEST_PASSWORD?.trim());

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

  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 45_000 });
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
