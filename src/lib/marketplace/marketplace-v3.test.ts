import { describe, expect, it } from "vitest";
import {
  buildPriceSignalsFromListings,
  mapDiscoveryJsonToCardsV3,
  mapMarketOfferRowToV3DTO,
} from "@/lib/marketplace/v3-mappers";

describe("marketplace v3 mappers (Phase 71)", () => {
  it("maps discovery JSON into listings", () => {
    const j = {
      want_by_catalog: [{ catalog_card_id: "a", collector_count: 3, card_count: 2 }],
      offer_by_catalog: [{ catalog_card_id: "b", collector_count: 5, card_count: 1 }],
      match_hints: [{ catalog_card_id: "a", match_kind: "you_lf_they_ft" }],
    };
    const out = mapDiscoveryJsonToCardsV3(j);
    expect(out.want_by_catalog[0]?.intent).toBe("looking_for");
    expect(out.offer_by_catalog[0]?.intent).toBe("for_trade");
    expect(out.match_hints[0]?.match_kind).toBe("you_lf_they_ft");
  });

  it("builds qualitative price signals", () => {
    const want = [
      { catalog_card_id: "x", intent: "looking_for" as const, collector_count: 10, card_count: 4 },
    ];
    const offer = [
      { catalog_card_id: "x", intent: "for_trade" as const, collector_count: 4, card_count: 2 },
    ];
    const sig = buildPriceSignalsFromListings(want, offer, 5);
    expect(sig.length).toBeGreaterThan(0);
    expect(sig[0]?.catalog_card_id).toBe("x");
    expect(sig[0]?.tone).toMatch(/rising_interest|steady|cooling/);
  });

  it("maps offer rows to v3 DTO without throwing", () => {
    const dto = mapMarketOfferRowToV3DTO({
      id: "00000000-0000-4000-8000-000000000001",
      thread_id: "00000000-0000-4000-8000-000000000002",
      status: "pending",
      catalog_card_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      body: "Looking for a holo Charizard proxy for my binder display.",
      items_offered: [],
      items_requested: [],
    });
    expect(dto.summary_line.length).toBeGreaterThan(0);
    expect(dto.thread_id).toContain("0000");
  });
});
