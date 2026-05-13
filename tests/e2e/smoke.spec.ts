import { test, expect } from "@playwright/test";

/**
 * Smoke checks (no credentials). Extend with authenticated flows when test users exist.
 */
test.describe("public shell", () => {
  test("home responds", async ({ page }) => {
    const res = await page.goto("/");
    const status = res?.status() ?? 0;
    expect(status === 200 || (status >= 300 && status < 400)).toBeTruthy();
    await expect(page.getByRole("link", { name: /MyCardArchive/i })).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });

  test("tier page requires auth (redirects to sign-in)", async ({ page }) => {
    await page.goto("/tier");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test("health core responds", async ({ request }) => {
    const res = await request.get("/api/health/core");
    expect(res.ok()).toBeTruthy();
    const json = (await res.json()) as { ok?: boolean };
    expect(json.ok).toBe(true);
  });
});
