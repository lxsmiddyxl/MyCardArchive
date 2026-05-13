import { describe, expect, it } from "vitest";
import { trendFromDiscoverySlices } from "@/lib/marketplace/trend-intelligence";

describe("marketplace trend intelligence (Phase 76)", () => {
  it("labels velocity qualitatively", () => {
    const want = [{ catalog_card_id: "x", intent: "looking_for" as const, collector_count: 40, card_count: 10 }];
    const offer = [{ catalog_card_id: "x", intent: "for_trade" as const, collector_count: 20, card_count: 8 }];
    const t = trendFromDiscoverySlices("x", want, offer);
    expect(t.catalog_card_id).toBe("x");
    expect(t.label).toMatch(/rising_interest|steady|cooling/);
    expect(t.relative_velocity).toBeGreaterThanOrEqual(0);
  });
});
