import { describe, expect, it } from "vitest";
import {
  mapRowToMarketplaceV3OfferDTO,
  offerHistoryRole,
  validateRespondPayload,
} from "@/lib/marketplace/v3-offer-lifecycle";

describe("marketplace v3 offer lifecycle (Phase 81)", () => {
  it("maps offer rows to v3 DTO", () => {
    const dto = mapRowToMarketplaceV3OfferDTO({
      id: "00000000-0000-4000-8000-000000000001",
      thread_id: "00000000-0000-4000-8000-000000000002",
      from_user_id: "00000000-0000-4000-8000-000000000003",
      to_user_id: "00000000-0000-4000-8000-000000000004",
      body: "Trade my holo for your reverse.",
      status: "pending",
      created_at: "2026-01-01T00:00:00.000Z",
      items_offered: [],
      items_requested: [],
    });
    expect(dto.offerId).toContain("0000");
    expect(dto.summaryLine.length).toBeGreaterThan(0);
  });

  it("classifies viewer role in history", () => {
    const offer = {
      fromUserId: "a",
      toUserId: "b",
    };
    expect(offerHistoryRole("a", offer)).toBe("sent");
    expect(offerHistoryRole("b", offer)).toBe("received");
    expect(offerHistoryRole("c", offer)).toBeNull();
  });

  it("validates respond actions", () => {
    expect(validateRespondPayload({ offerId: "x", action: "accept" }).ok).toBe(true);
    expect(validateRespondPayload({ offerId: "x", action: "nope" }).ok).toBe(false);
    expect(validateRespondPayload({ offerId: "x", action: "counter" }).ok).toBe(false);
  });
});
