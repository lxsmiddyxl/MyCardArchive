import { expect, test } from "./fixtures/auth";

/**
 * Authenticated UX for binders / decks / trades (needs E2E_TEST_EMAIL + E2E_TEST_PASSWORD).
 * Covers empty vs loaded shells — cross-account RLS needs a second fixture user (not included).
 */
test.describe("binders / decks / trades (authenticated)", () => {
  test("binders: heading and either empty state or shelf grid", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/binders");
    await expect(page.getByRole("heading", { name: /your binders/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByText(/no binders yet/i).or(page.locator("ul.grid"))
    ).toBeVisible({ timeout: 15_000 });
  });

  test("decks: heading and either empty state or deck cards", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/decks");
    await expect(page.getByRole("heading", { name: /your decks/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page
        .getByText(/don't have any Pokémon decks yet/i)
        .or(page.locator('a[href^="/decks/"]').first())
    ).toBeVisible({ timeout: 15_000 });
  });

  test("trades: dashboard headings and either empty hint or rows", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/trades");
    await expect(page.getByRole("heading", { name: /^trades$/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("heading", { name: /^active$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^completed$/i })).toBeVisible();
    await expect(
      page.getByText(/no trades yet/i).or(page.locator('[role="listitem"]').first())
    ).toBeVisible({ timeout: 15_000 });
  });
});
