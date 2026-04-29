import { expect, test } from "./fixtures/auth";

/**
 * Authenticated UI smoke (requires `E2E_TEST_EMAIL` + `E2E_TEST_PASSWORD`).
 * In CI, set secrets on the workflow; locally export env vars against a dev Supabase user.
 */
test.describe("authenticated shell", () => {
  test("tier page shows membership heading", async ({ authenticatedPage: page }) => {
    await page.goto("/tier");
    await expect(page.getByRole("heading", { name: /your tier/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("binders list loads", async ({ authenticatedPage: page }) => {
    await page.goto("/binders");
    await expect(page.getByRole("heading", { name: /your binders/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("binder create page loads", async ({ authenticatedPage: page }) => {
    await page.goto("/binders/create");
    await expect(page.getByRole("heading", { name: /create binder/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("decks list loads", async ({ authenticatedPage: page }) => {
    await page.goto("/decks");
    await expect(page.getByRole("heading", { name: /your decks/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("trades dashboard loads", async ({ authenticatedPage: page }) => {
    await page.goto("/trades");
    await expect(page.getByRole("heading", { name: /^trades$/i })).toBeVisible({
      timeout: 20_000,
    });
  });
});
