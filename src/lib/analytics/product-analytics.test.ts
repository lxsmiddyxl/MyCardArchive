import { describe, expect, it } from "vitest";
import { isProductAnalyticsEventName } from "@/lib/analytics/product-events";
import { redactPathForAnalytics, surfaceFromPath } from "@/lib/analytics/privacy-path";

describe("privacy-path (Phase 61)", () => {
  it("redacts UUID path segments", () => {
    expect(redactPathForAnalytics("/binders/aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee")).toBe(
      "/binders/:id"
    );
    expect(redactPathForAnalytics("/profile/123e4567-e89b-12d3-a456-426614174000")).toBe(
      "/profile/:id"
    );
  });

  it("preserves non-uuid segments", () => {
    expect(redactPathForAnalytics("/community")).toBe("/community");
    expect(redactPathForAnalytics("/decks")).toBe("/decks");
  });
});

describe("surfaceFromPath", () => {
  it("maps first segment to surface", () => {
    expect(surfaceFromPath("/binders/:id")).toBe("binders");
    expect(surfaceFromPath("/welcome")).toBe("welcome");
  });
});

describe("product event names", () => {
  it("validates known keys", () => {
    expect(isProductAnalyticsEventName("pageview")).toBe(true);
    expect(isProductAnalyticsEventName("trade_create")).toBe(true);
    expect(isProductAnalyticsEventName("unknown")).toBe(false);
  });
});
