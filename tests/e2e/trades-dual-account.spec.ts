import { expect, test } from "@playwright/test";
import { readApiData } from "./fixtures/api-envelope";
import {
  clearBrowserSession,
  hasDualAccountCredentials,
  hasEnvCredentials,
  loginAsUser,
  readSelfUserIdFromProfile,
} from "./fixtures/auth";

function cardsFromListBody(body: unknown): { id: string }[] | undefined {
  const data = readApiData<{ cards?: { id: string }[] }>(body);
  if (data && Array.isArray(data.cards)) return data.cards;
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const b = body as { cards?: { id: string }[] };
    if (Array.isArray(b.cards)) return b.cards;
  }
  return undefined;
}

function tradeIdFromCreateBody(body: unknown): string | undefined {
  const data = readApiData<{ trade?: { id: string } }>(body);
  if (data?.trade?.id) return data.trade.id;
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const b = body as { trade?: { id: string } };
    return b.trade?.id;
  }
  return undefined;
}

function bindersFromListBody(body: unknown): { id: string }[] | undefined {
  const data = readApiData<{ binders?: { id: string }[] }>(body);
  if (data && Array.isArray(data.binders)) return data.binders;
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const b = body as { binders?: { id: string }[] };
    if (Array.isArray(b.binders)) return b.binders;
  }
  return undefined;
}

/** UUID-shaped id unlikely to exist as a trade row for the signed-in user. */
const FOREIGN_TRADE_ID = "00000000-0000-4000-8000-000000000042";

test.describe("Trades — visibility (non-party / anonymous)", () => {
  test("authenticated non-party sees trade not found for a foreign trade id", async ({
    page,
  }, testInfo) => {
    if (!hasEnvCredentials()) {
      testInfo.skip(true, "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD.");
    }
    await loginAsUser(page, process.env.E2E_TEST_EMAIL!.trim(), process.env.E2E_TEST_PASSWORD!.trim());
    await page.goto(`/trades/${FOREIGN_TRADE_ID}`);
    await expect(page.getByText(/trade not found/i).first()).toBeVisible({ timeout: 25_000 });
  });

  test("unauthenticated visitor is redirected away from trade detail", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(`/trades/${FOREIGN_TRADE_ID}`);
    await expect(page).toHaveURL(/\/auth\/sign-in|\/login/, { timeout: 20_000 });
  });
});

test.describe("Trades — creator & counterparty", () => {
  test.beforeEach(({}, testInfo) => {
    if (!hasDualAccountCredentials()) {
      testInfo.skip(
        true,
        "Set E2E_TEST_EMAIL, E2E_TEST_PASSWORD, E2E_COUNTERPARTY_EMAIL, and E2E_COUNTERPARTY_PASSWORD."
      );
    }
  });

  test("binder lists have no cross-account id overlap (RLS)", async ({ page }, testInfo) => {
    const emailA = process.env.E2E_TEST_EMAIL!.trim();
    const passwordA = process.env.E2E_TEST_PASSWORD!.trim();
    const emailB = process.env.E2E_COUNTERPARTY_EMAIL!.trim();
    const passwordB = process.env.E2E_COUNTERPARTY_PASSWORD!.trim();

    await loginAsUser(page, emailA, passwordA);
    const resA = await page.request.get("/api/binders");
    expect(resA.ok()).toBeTruthy();
    const idsA = new Set((bindersFromListBody(await resA.json()) ?? []).map((b) => b.id));

    await clearBrowserSession(page);
    await loginAsUser(page, emailB, passwordB);
    const resB = await page.request.get("/api/binders");
    expect(resB.ok()).toBeTruthy();
    const idsB = new Set((bindersFromListBody(await resB.json()) ?? []).map((b) => b.id));

    if (idsA.size === 0 || idsB.size === 0) {
      testInfo.skip(true, "Need at least one binder on each account for overlap check.");
    }
    for (const id of idsA) {
      expect(idsB.has(id)).toBe(false);
    }
    for (const id of idsB) {
      expect(idsA.has(id)).toBe(false);
    }
  });

  test("creator and counterparty both see the same trade detail", async ({ page }, testInfo) => {
    const emailA = process.env.E2E_TEST_EMAIL!.trim();
    const passwordA = process.env.E2E_TEST_PASSWORD!.trim();
    const emailB = process.env.E2E_COUNTERPARTY_EMAIL!.trim();
    const passwordB = process.env.E2E_COUNTERPARTY_PASSWORD!.trim();

    await loginAsUser(page, emailA, passwordA);
    const listA = await page.request.get("/api/cards/list");
    expect(listA.ok()).toBeTruthy();
    const bodyA = await listA.json();
    const creatorCardId = cardsFromListBody(bodyA)?.[0]?.id;
    if (!creatorCardId) {
      testInfo.skip(true, "Primary test account needs at least one card in /api/cards/list.");
    }

    await clearBrowserSession(page);
    await loginAsUser(page, emailB, passwordB);

    const counterpartyId = await readSelfUserIdFromProfile(page);
    expect(counterpartyId).toBeTruthy();

    const listB = await page.request.get("/api/cards/list");
    expect(listB.ok()).toBeTruthy();
    const bodyB = await listB.json();
    const counterpartyCardId = cardsFromListBody(bodyB)?.[0]?.id;
    if (!counterpartyCardId) {
      testInfo.skip(true, "Counterparty account needs at least one card in /api/cards/list.");
    }

    await clearBrowserSession(page);
    await loginAsUser(page, emailA, passwordA);

    const createRes = await page.request.post("/api/trades/create", {
      data: {
        counterpartyId,
        offerLines: [{ cardId: creatorCardId, quantity: 1 }],
        requestLines: [{ cardId: counterpartyCardId, quantity: 1 }],
        sendNow: false,
      },
      headers: { "Content-Type": "application/json" },
    });
    if (!createRes.ok()) {
      const errText = await createRes.text();
      throw new Error(`POST /api/trades/create failed: ${createRes.status()} ${errText}`);
    }
    const created = await createRes.json();
    const tradeId = tradeIdFromCreateBody(created);
    expect(tradeId).toBeTruthy();

    await page.goto(`/trades/${tradeId}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(tradeId!.slice(0, 8), {
      timeout: 30_000,
    });
    await expect(page.getByText(/^draft$/i).first()).toBeVisible({ timeout: 15_000 });

    await clearBrowserSession(page);
    await loginAsUser(page, emailB, passwordB);
    await page.goto(`/trades/${tradeId}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(tradeId!.slice(0, 8), {
      timeout: 30_000,
    });
    await expect(page.getByText(/^draft$/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
