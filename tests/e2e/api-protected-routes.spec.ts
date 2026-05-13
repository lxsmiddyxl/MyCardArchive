import { test, expect } from "@playwright/test";
import { readApiErrorMessage } from "./fixtures/api-envelope";

/**
 * Contract checks for session-scoped APIs without a browser cookie.
 * Does not require E2E_TEST_* credentials.
 */
test.describe("protected API routes (no session)", () => {
  test("GET /api/binders returns 401 MCA envelope", async ({ request }) => {
    const res = await request.get("/api/binders");
    expect(res.status()).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(false);
    expect(readApiErrorMessage(body)).toMatch(/unauthorized/i);
  });

  test("GET /api/decks/list returns 401 MCA envelope", async ({ request }) => {
    const res = await request.get("/api/decks/list");
    expect(res.status()).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(false);
    expect(readApiErrorMessage(body)).toMatch(/unauthorized/i);
  });

  test("GET /api/trades/list returns 401 MCA envelope", async ({ request }) => {
    const res = await request.get("/api/trades/list");
    expect(res.status()).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(false);
    expect(readApiErrorMessage(body)).toMatch(/unauthorized/i);
  });

  test("GET /api/activity-waves/platform returns 401 MCA envelope", async ({ request }) => {
    const res = await request.get("/api/activity-waves/platform");
    expect(res.status()).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(false);
    expect(readApiErrorMessage(body)).toMatch(/unauthorized/i);
    expect(typeof body.context_id).toBe("string");
  });

  test("GET /api/activity-waves/club returns 401 MCA envelope", async ({ request }) => {
    const res = await request.get("/api/activity-waves/club?clubId=test");
    expect(res.status()).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(false);
    expect(readApiErrorMessage(body)).toMatch(/unauthorized/i);
  });
});
