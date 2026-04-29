import { expect, test } from "./fixtures/auth";

/**
 * Scenario-level navigation smoke: verifies shells for deck edit, binder, trades,
 * matching, scan, and inventory (card detail when data exists).
 */
test.describe("scenario flows (authenticated)", () => {
  test("deck editing: list → editor shell", async ({ authenticatedPage: page }) => {
    await page.goto("/decks");
    await expect(page.getByRole("heading", { name: /your decks/i })).toBeVisible({
      timeout: 20_000,
    });
    const deckLink = page.locator('a[href^="/decks/"]').first();
    const n = await deckLink.count();
    if (n === 0) {
      test.skip();
      return;
    }
    await deckLink.click();
    await expect(page).toHaveURL(/\/decks\/[^/]+$/);
    await expect(
      page.getByRole("heading", { name: /deck editor/i })
    ).toBeVisible({ timeout: 20_000 });
  });

  test("binder: list → binder detail", async ({ authenticatedPage: page }) => {
    await page.goto("/binders");
    await expect(page.getByRole("heading", { name: /your binders/i })).toBeVisible({
      timeout: 20_000,
    });
    const binderLink = page.locator('a[href^="/binders/"]:not([href="/binders/create"])').first();
    const n = await binderLink.count();
    if (n === 0) {
      test.skip();
      return;
    }
    await binderLink.click();
    await expect(page).toHaveURL(/\/binders\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
  });

  test("trade negotiation: new trade shell", async ({ authenticatedPage: page }) => {
    await page.goto("/trades/new");
    await expect(page.getByRole("heading", { name: /^new trade$/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("matching: discovery shell", async ({ authenticatedPage: page }) => {
    await page.goto("/matching");
    await expect(page.getByRole("heading", { name: /trade discovery/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("scan → results area (grading via card detail when inventory has cards)", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/scan");
    await expect(page.getByRole("heading", { name: /scan a card/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByLabel(/binder \(optional\)/i)).toBeVisible();

    await page.goto("/cards");
    await expect(page.getByText(/global inventory/i)).toBeVisible({ timeout: 20_000 });

    const openCard = page.getByRole("button", { name: /card details/i }).first();
    if ((await openCard.count()) === 0) {
      return;
    }
    await openCard.click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/^Grading$/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
