import { describe, expect, it } from "vitest";
import { snippetForCommunityFeedV1 } from "@/lib/community/feed-v1-filters";

describe("snippetForCommunityFeedV1 (Phase 63)", () => {
  it("strips null bytes and truncates", () => {
    const s = "hello\u0000world";
    expect(snippetForCommunityFeedV1(s)).toBe("helloworld");
    const long = "x".repeat(400);
    expect(snippetForCommunityFeedV1(long, 10).length).toBeLessThanOrEqual(10);
  });
});
