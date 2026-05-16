import { describe, expect, it } from "vitest";
import { buildValueSignalsV2, toneFromSignals } from "@/lib/market/value-signals-v2";

describe("value signals v2 (Phase 83)", () => {
  it("classifies tone from velocity and desirability", () => {
    expect(toneFromSignals(0.8, 0.7)).toBe("high_interest");
    expect(toneFromSignals(0.1, 0.1)).toBe("low_activity");
  });

  it("builds signals for catalog cards", () => {
    const sig = buildValueSignalsV2(
      [{ catalog_card_id: "a", intent: "looking_for", collector_count: 8, card_count: 3 }],
      [{ catalog_card_id: "a", intent: "for_trade", collector_count: 4, card_count: 2 }]
    );
    expect(sig[0]?.catalogCardId).toBe("a");
    expect(sig[0]?.hint.length).toBeGreaterThan(0);
  });
});
