import { MCA_ANALYTICS_EVENTS, isMcaAnalyticsEventName } from "@/mca-utils/analytics/events";
import { MCA_RATE_LIMITS, isWithinRateLimit } from "@/mca-utils/rate-limit/limiter";
import { validateProductionEnv } from "@/mca-utils/env/validateEnv";
import {
  embedCorsAllowOrigin,
  embedFrameAncestorsDirective,
  parseEmbedAllowlist,
} from "@/lib/cors/embed-cors";
import {
  apexHostFromWww,
  shouldRedirectWwwToApex,
  toCanonicalUrl,
} from "@/lib/seo/canonical-url";
import { createTraceId } from "@/mca-utils/logging/trace";
import { describe, expect, it, vi, beforeEach } from "vitest";

describe("launch prep phase 3 — env validation", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
  });

  it("returns parity report without throwing in test", () => {
    const r = validateProductionEnv({ throwOnMissing: false });
    expect(r).toMatchObject({
      ok: expect.any(Boolean),
      missingRequired: expect.any(Array),
      warnings: expect.any(Array),
    });
  });
});

describe("launch prep phase 3 — analytics events", () => {
  it("defines launch funnel events", () => {
    expect(MCA_ANALYTICS_EVENTS.page_view).toBe("page_view");
    expect(isMcaAnalyticsEventName("embed_view")).toBe(true);
    expect(isMcaAnalyticsEventName("not_real")).toBe(false);
  });
});

describe("launch prep phase 3 — rate limits", () => {
  it("exposes phase 3 profile and onboarding buckets", () => {
    expect(MCA_RATE_LIMITS.profileMutation.max).toBe(24);
    expect(MCA_RATE_LIMITS.onboardingMutation.max).toBe(40);
  });

  it("allows requests under the limit", () => {
    const key = `test-${Date.now()}`;
    const opts = { max: 3, windowMs: 60_000 };
    expect(isWithinRateLimit(key, opts)).toBe(true);
    expect(isWithinRateLimit(key, opts)).toBe(true);
  });
});

describe("launch prep phase 3 — canonical URL", () => {
  it("redirects www to apex for production host", () => {
    expect(shouldRedirectWwwToApex("www.mycardarchive.com")).toBe(true);
    expect(shouldRedirectWwwToApex("mycardarchive.com")).toBe(false);
    expect(apexHostFromWww("www.mycardarchive.com")).toBe("mycardarchive.com");
  });

  it("builds canonical URLs from site origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://mycardarchive.com");
    expect(toCanonicalUrl("/features/binders")).toBe(
      "https://mycardarchive.com/features/binders"
    );
  });
});

describe("launch prep phase 3 — embed CORS", () => {
  it("parses embed allowlist from env", () => {
    vi.stubEnv("MCA_EMBED_ALLOWLIST", "collector.example.com,https://partner.test");
    const list = parseEmbedAllowlist(process.env.MCA_EMBED_ALLOWLIST);
    expect(list).toContain("https://collector.example.com");
    expect(list).toContain("https://partner.test");
  });

  it("builds frame-ancestors directive", () => {
    const csp = embedFrameAncestorsDirective(["https://mycardarchive.com"]);
    expect(csp).toContain("frame-ancestors");
    expect(csp).toContain("https://mycardarchive.com");
  });

  it("allows CORS only for listed origins", () => {
    const allowed = parseEmbedAllowlist("https://mycardarchive.com");
    expect(embedCorsAllowOrigin("https://mycardarchive.com", allowed)).toBe(
      "https://mycardarchive.com"
    );
    expect(embedCorsAllowOrigin("https://evil.test", allowed)).toBeNull();
  });
});

describe("launch prep phase 3 — tracing", () => {
  it("creates trace ids", () => {
    const id = createTraceId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });
});
