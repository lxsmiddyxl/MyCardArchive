/**
 * RLS-focused surfaces. Requires a running app (`playwright.config.ts` starts `npm run dev:pw`
 * locally unless `PLAYWRIGHT_SKIP_WEBSERVER` is set — see `docs/runbooks/e2e-playwright.md`).
 * Authenticated blocks need `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`.
 */
import { expect, test } from "@playwright/test";
import { readApiData, readApiErrorMessage, isApiSuccess } from "./fixtures/api-envelope";
import { expect as authExpect, test as authTest } from "./fixtures/auth";

/** UUID v4-shaped id unlikely to exist as an owned row for the test account. */
const FOREIGN_ID = "00000000-0000-4000-8000-000000000042";

async function firstBinderHref(page: import("@playwright/test").Page): Promise<string | null> {
  const links = page.locator('a[href^="/binders/"]');
  const n = await links.count();
  for (let i = 0; i < n; i++) {
    const h = await links.nth(i).getAttribute("href");
    if (!h || h.startsWith("/binders/create")) continue;
    return h;
  }
  return null;
}

function binderIdFromHref(href: string): string | null {
  const m = /^\/binders\/([^/]+)/.exec(href);
  return m?.[1] ?? null;
}

test.describe("RLS surfaces (unauthenticated)", () => {
  test("market redirects to sign-in", async ({ page }) => {
    await page.goto("/market");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test("decks list redirects to sign-in (no session)", async ({ page }) => {
    await page.goto("/decks");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });
});

authTest.describe("RLS surfaces (authenticated)", () => {
  authTest(
    "GET /api/binders returns MCA success envelope",
    async ({ authenticatedPage: page }) => {
      const res = await page.request.get("/api/binders");
      authExpect(res.ok()).toBeTruthy();
      const body = (await res.json()) as Record<string, unknown>;
      authExpect(isApiSuccess(body)).toBe(true);
      const data = readApiData<{ binders?: unknown[] }>(body) ?? body;
      authExpect(Array.isArray(data.binders)).toBe(true);
      authExpect(typeof body.context_id).toBe("string");
    }
  );

  authTest(
    "binder detail (owner): opens first non-create binder when present",
    async ({ authenticatedPage: page }, testInfo) => {
      await page.goto("/binders");
      await authExpect(
        page.getByRole("heading", { name: /your binders/i })
      ).toBeVisible({ timeout: 25_000 });
      const href = await firstBinderHref(page);
      if (!href) {
        testInfo.skip(true, "No binders in test account.");
      }
      await page.goto(href!);
      await authExpect(page.getByRole("heading").first()).toBeVisible({ timeout: 20_000 });
    }
  );

  authTest("binder detail (non-owner): unknown id shows binder not found", async ({
    authenticatedPage: page,
  }) => {
    await page.goto(`/binders/${FOREIGN_ID}`);
    await authExpect(page.getByRole("heading", { name: /binder not found/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  authTest(
    "binder add-card route loads when a binder exists",
    async ({ authenticatedPage: page }, testInfo) => {
      await page.goto("/binders");
      const href = await firstBinderHref(page);
      if (!href) {
        testInfo.skip(true, "No binders in test account.");
      }
      const id = binderIdFromHref(href!);
      if (!id) {
        testInfo.skip(true, "Could not parse binder id.");
      }
      await page.goto(`/binders/${id}/add-card`);
      await authExpect(page.getByRole("heading", { name: /add card/i })).toBeVisible({
        timeout: 25_000,
      });
    }
  );

  authTest("binder analytics: foreign binder id is 404", async ({ authenticatedPage: page }) => {
    const res = await page.goto(`/binders/${FOREIGN_ID}/analytics`);
    authExpect(res?.status() ?? 0).toBe(404);
  });

  authTest(
    "binder analytics (owner): loads when a binder exists",
    async ({ authenticatedPage: page }, testInfo) => {
      await page.goto("/binders");
      const href = await firstBinderHref(page);
      if (!href) {
        testInfo.skip(true, "No binders in test account.");
      }
      const id = binderIdFromHref(href!);
      if (!id) {
        testInfo.skip(true, "Could not parse binder id.");
      }
      await page.goto(`/binders/${id}/analytics`);
      await authExpect(page.getByText(/binder analytics/i).first()).toBeVisible({
        timeout: 25_000,
      });
    }
  );

  authTest(
    "deck detail (owner): editor loads when a deck exists",
    async ({ authenticatedPage: page }, testInfo) => {
      await page.goto("/decks");
      await authExpect(page.getByRole("heading", { name: /your decks/i })).toBeVisible({
        timeout: 25_000,
      });
      const link = page.locator('a[href^="/decks/"]').first();
      if ((await link.count()) === 0) {
        testInfo.skip(true, "No decks in test account.");
      }
      await link.click();
      await authExpect(page.getByText(/edit list composition/i)).toBeVisible({
        timeout: 25_000,
      });
    }
  );

  authTest("deck detail (non-owner): unknown id redirects to deck list", async ({
    authenticatedPage: page,
  }) => {
    await page.goto(`/decks/${FOREIGN_ID}`);
    await expect(page).toHaveURL(/\/decks\/?$/, { timeout: 20_000 });
  });

  authTest("deck creation failure: POST /api/decks/create validates name", async ({
    authenticatedPage: page,
  }) => {
    const res = await page.request.post("/api/decks/create", {
      data: { name: "" },
    });
    authExpect(res.status()).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    authExpect(readApiErrorMessage(body)).toMatch(/name is required/i);
  });

  authTest("trade detail (non-party): shows trade not found", async ({
    authenticatedPage: page,
  }) => {
    await page.goto(`/trades/${FOREIGN_ID}`);
    await authExpect(page.getByText(/trade not found/i).first()).toBeVisible({
      timeout: 25_000,
    });
  });

  authTest("trade creation failure: missing counterpartyId", async ({
    authenticatedPage: page,
  }) => {
    const res = await page.request.post("/api/trades/create", {
      data: { sendNow: false },
      headers: { "Content-Type": "application/json" },
    });
    authExpect(res.status()).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    authExpect(readApiErrorMessage(body)).toMatch(/counterpartyId/i);
  });

  authTest("profile edit (owner) loads", async ({ authenticatedPage: page }) => {
    await page.goto("/profile/edit");
    await authExpect(page.getByRole("heading", { name: /edit profile/i })).toBeVisible({
      timeout: 25_000,
    });
  });

  authTest("market: discovery loads for signed-in user", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/market");
    await authExpect(
      page.getByRole("heading", { name: /marketplace discovery/i })
    ).toBeVisible({ timeout: 25_000 });
  });

  authTest("scan: surface loads with Scan a Card heading", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/scan");
    await authExpect(page.getByRole("heading", { name: /scan a card/i })).toBeVisible({
      timeout: 25_000,
    });
  });

  authTest("GET /api/activity-waves/platform returns MCA success envelope", async ({
    authenticatedPage: page,
  }) => {
    const res = await page.request.get("/api/activity-waves/platform");
    authExpect(res.ok()).toBeTruthy();
    const body = (await res.json()) as Record<string, unknown>;
    authExpect(isApiSuccess(body)).toBe(true);
    authExpect(typeof body.context_id).toBe("string");
    const data = readApiData<{ cells?: unknown[] }>(body) ?? body;
    authExpect(Array.isArray(data.cells)).toBe(true);
  });
});
