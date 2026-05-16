import { describe, expect, it } from "vitest";
import { trustScoreV4 } from "@/lib/reputation/reputation-v4";

describe("reputation v4 trust graph (Phase 87)", () => {
  it("returns bounded trust score with edges", () => {
    const g = trustScoreV4({
      userId: "u1",
      graph: {
        helpfulness_score: 80,
        expertise_score: 70,
        positivity_score: 75,
        reliability_score: 72,
        contribution_score: 68,
      },
      trades_completed: 10,
      trades_total: 12,
      community_posts: 5,
      report_count_bucket: 0,
      followingIds: ["u2", "u3"],
      followerIds: ["u2"],
    });
    expect(g.trustScoreV4).toBeGreaterThan(0);
    expect(g.trustScoreV4).toBeLessThanOrEqual(1);
    expect(g.edges.length).toBeGreaterThan(0);
  });
});
