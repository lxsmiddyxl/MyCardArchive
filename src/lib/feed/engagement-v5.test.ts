import { describe, expect, it } from "vitest";
import { rankFeedItemsV5 } from "@/lib/feed/engagement-v5";
import type { FeedItemForRank } from "@/lib/feed/hybrid-rank";

const base = (id: string, actor: string): FeedItemForRank => ({
  id,
  kind: "post",
  actor_id: actor,
  created_at: new Date().toISOString(),
  signals: { engagement: 100 },
});

describe("feed ranking v5 (Phase 88)", () => {
  it("ranks items with trust boost", () => {
    const items = [base("a", "low"), base("b", "high")];
    const { items: ranked } = rankFeedItemsV5("viewer", items, { useMl: false }, {
      trustByActor: { low: 0.2, high: 0.95 },
    });
    expect(ranked[0]?.actor_id).toBe("high");
  });
});
