import { test, expect } from "@playwright/test";

/**
 * Contract checks for session-scoped APIs without a browser cookie.
 * Does not require E2E_TEST_* credentials.
 */
test.describe("protected API routes (no session)", () => {
  test("GET /api/binders returns 401 MCA envelope", async ({ request }) => {
    const res = await request.get("/api/binders");
    expect(res.status()).toBe(401);
    const body = (await res.json()) as { success?: boolean; error?: string };
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/unauthorized/i);
  });

  test("GET /api/decks/list returns 401 MCA envelope", async ({ request }) => {
    const res = await request.get("/api/decks/list");
    expect(res.status()).toBe(401);
    const body = (await res.json()) as { success?: boolean; error?: string };
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/unauthorized/i);
  });

  test("GET /api/trades/list returns 401 MCA envelope", async ({ request }) => {
    const res = await request.get("/api/trades/list");
    expect(res.status()).toBe(401);
    const body = (await res.json()) as { success?: boolean; error?: string };
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/unauthorized/i);
  });

  test("GET /api/activity-waves/platform returns 401 MCA envelope", async ({ request }) => {
    const res = await request.get("/api/activity-waves/platform");
    expect(res.status()).toBe(401);
    const body = (await res.json()) as { success?: boolean; error?: string; context_id?: string };
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/unauthorized/i);
    expect(typeof body.context_id).toBe("string");
  });

  test("GET /api/activity-waves/club returns 401 MCA envelope", async ({ request }) => {
    const res = await request.get("/api/activity-waves/club?clubId=test");
    expect(res.status()).toBe(401);
    const body = (await res.json()) as { success?: boolean; error?: string };
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/unauthorized/i);
  });
});
