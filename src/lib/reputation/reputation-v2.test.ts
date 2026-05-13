import { inferBadgeCategoryFromSlug } from "@/lib/reputation/badge-categories";
import { compositeReputation01 } from "@/lib/reputation/composite-score";
import { describe, expect, it } from "vitest";

describe("badge categories (Phase 64)", () => {
  it("classifies reliability-ish slugs", () => {
    expect(inferBadgeCategoryFromSlug("trade_streak_v1")).toBe("reliability");
  });

  it("classifies contribution slugs", () => {
    expect(inferBadgeCategoryFromSlug("community_posts_bronze")).toBe("contribution");
  });
});

describe("compositeReputation01", () => {
  it("returns mid when row missing", () => {
    expect(compositeReputation01(undefined)).toBe(0.5);
  });

  it("increases with stronger dimensions", () => {
    const low = compositeReputation01({
      helpfulness_score: 10,
      expertise_score: 10,
      positivity_score: 10,
      reliability_score: 10,
      contribution_score: 10,
    });
    const high = compositeReputation01({
      helpfulness_score: 120,
      expertise_score: 120,
      positivity_score: 120,
      reliability_score: 120,
      contribution_score: 120,
    });
    expect(high).toBeGreaterThan(low);
  });
});
