import { test, expect } from "@playwright/test";

/**
 * Minimal public health check for CI matrix jobs (no auth, no Supabase writes).
 * @see docs/runbooks/e2e-playwright.md
 */
test.describe("Public health (launch matrix)", () => {
  test("GET /api/health/ui returns 200 JSON", async ({ request }) => {
    const res = await request.get("/api/health/ui");
    expect(res.ok()).toBeTruthy();
    const json = (await res.json()) as { ok?: unknown };
    expect(json).toHaveProperty("ok");
  });
});
