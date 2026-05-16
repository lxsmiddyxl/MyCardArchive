import { isAdminEmail } from "@/lib/invites/invite-config";
import { describe, expect, it, vi } from "vitest";

describe("launch prep phase 5 — admin access", () => {
  it("recognizes admin emails from env", () => {
    vi.stubEnv("MCA_ADMIN_EMAILS", "ops@mycardarchive.com,founder@mycardarchive.com");
    expect(isAdminEmail("ops@mycardarchive.com")).toBe(true);
    expect(isAdminEmail("other@test.com")).toBe(false);
  });
});
