import { rankFeedItemsV4 } from "@/lib/feed/engagement-v4";
import { describe, expect, it } from "vitest";

describe("rankFeedItemsV4 reputation (Phase 67)", () => {
  it("boosts items from higher-reputation actors", () => {
    const viewer = "viewer-1";
    const base = {
      id: "e1",
      kind: "test",
      actor_id: "a1",
      created_at: new Date().toISOString(),
      signals: { engagement: 100, mutual: 0 },
    };
    const low = rankFeedItemsV4(
      viewer,
      [{ ...base, id: "e-low" }],
      { useMl: false },
      { reputationByActor: { a1: 0.2 } }
    );
    const high = rankFeedItemsV4(
      viewer,
      [{ ...base, id: "e-high" }],
      { useMl: false },
      { reputationByActor: { a1: 0.95 } }
    );
    const sLow = low.debug[0]?.v4?.combined ?? 0;
    const sHigh = high.debug[0]?.v4?.combined ?? 0;
    expect(sHigh).toBeGreaterThan(sLow);
  });
});
