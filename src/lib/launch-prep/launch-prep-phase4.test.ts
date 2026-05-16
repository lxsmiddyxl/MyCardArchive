import {
  isAdminEmail,
  isInviteGateEnabled,
  normalizeInviteCode,
} from "@/lib/invites/invite-config";
import { generateInviteCode } from "@/lib/invites/invite-config";
import { parsePublicEnv, publicEnvSchema } from "@/mca-utils/env/schema";
import { assertRequiredProductionEnv } from "@/mca-utils/env/required";
import { resetEnvCache } from "@/mca-utils/env/load";
import {
  embedFrameAncestorsDirective,
  parseEmbedAllowlist,
} from "@/lib/cors/embed-cors";
import { shouldRedirectWwwToApex } from "@/lib/seo/canonical-url";
import { describe, expect, it, vi, beforeEach } from "vitest";

function evaluateThresholds(
  result: { errorRate: number; histogram: { p95: number } },
  thresholds: { maxErrorRate: number; p95Ms: number }
) {
  const fails: string[] = [];
  if (result.errorRate > thresholds.maxErrorRate) fails.push("errorRate");
  if (result.histogram.p95 > thresholds.p95Ms) fails.push("p95");
  return { ok: fails.length === 0, fails };
}

describe("launch prep phase 4 — env schema", () => {
  beforeEach(() => {
    resetEnvCache();
    vi.stubEnv("NODE_ENV", "test");
  });

  it("parses valid public env", () => {
    const env = parsePublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc",
      NEXT_PUBLIC_SITE_URL: "https://mycardarchive.com",
    });
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://mycardarchive.com");
  });

  it("rejects invalid site url", () => {
    expect(() =>
      publicEnvSchema.parse({
        NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc",
        NEXT_PUBLIC_SITE_URL: "not-a-url",
      })
    ).toThrow();
  });

  it("asserts canonical production host", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://mycardarchive.com");
    const r = assertRequiredProductionEnv();
    expect(r.ok).toBe(true);
  });
});

describe("launch prep phase 4 — invites", () => {
  it("normalizes invite codes", () => {
    expect(normalizeInviteCode(" ab-12 ")).toBe("AB-12");
  });

  it("generates uppercase codes", () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[A-F0-9]+$/);
    expect(code.length).toBeGreaterThanOrEqual(8);
  });

  it("respects invite gate env", () => {
    vi.stubEnv("MCA_INVITE_REQUIRED", "true");
    expect(isInviteGateEnabled()).toBe(true);
    vi.stubEnv("MCA_ADMIN_EMAILS", "admin@mycardarchive.com");
    expect(isAdminEmail("admin@mycardarchive.com")).toBe(true);
  });
});

describe("launch prep phase 4 — canonical + embed", () => {
  it("enforces www redirect", () => {
    expect(shouldRedirectWwwToApex("www.mycardarchive.com")).toBe(true);
  });

  it("embed allowlist includes apex", () => {
    const csp = embedFrameAncestorsDirective(parseEmbedAllowlist());
    expect(csp).toContain("mycardarchive.com");
  });
});

describe("launch prep phase 4 — load test thresholds", () => {
  it("passes healthy synthetic metrics", () => {
    const evald = evaluateThresholds(
      { errorRate: 0, histogram: { p95: 100 } },
      { maxErrorRate: 0.1, p95Ms: 500 }
    );
    expect(evald.ok).toBe(true);
  });

  it("fails when error rate exceeds threshold", () => {
    const evald = evaluateThresholds(
      { errorRate: 0.5, histogram: { p95: 100 } },
      { maxErrorRate: 0.1, p95Ms: 500 }
    );
    expect(evald.ok).toBe(false);
  });
});
