import { describe, expect, it } from "vitest";
import { trustScoreV3 } from "@/lib/reputation/reputation-v3";

describe("reputation v3 trust blend (Phase 78)", () => {
  it("raises score with completion and participation", () => {
    const graph = {
      helpfulness_score: 70,
      expertise_score: 70,
      positivity_score: 70,
      reliability_score: 70,
      contribution_score: 70,
    };
    const low = trustScoreV3({
      graph,
      trades_completed: 0,
      trades_total: 10,
      community_posts: 0,
      report_count_bucket: 0,
    });
    const high = trustScoreV3({
      graph,
      trades_completed: 9,
      trades_total: 10,
      community_posts: 20,
      report_count_bucket: 0,
    });
    expect(high).toBeGreaterThan(low);
  });

  it("softly pulls score down when report bucket is elevated", () => {
    const graph = {
      helpfulness_score: 80,
      expertise_score: 80,
      positivity_score: 80,
      reliability_score: 80,
      contribution_score: 80,
    };
    const clean = trustScoreV3({
      graph,
      trades_completed: 5,
      trades_total: 8,
      community_posts: 4,
      report_count_bucket: 0,
    });
    const flagged = trustScoreV3({
      graph,
      trades_completed: 5,
      trades_total: 8,
      community_posts: 4,
      report_count_bucket: 3,
    });
    expect(flagged).toBeLessThan(clean);
  });
});
