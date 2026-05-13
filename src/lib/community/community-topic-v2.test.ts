import { describe, expect, it } from "vitest";
import { normalizeCommunityTopicSlug, splitCommunityTopicBody, withCommunityTopicLine } from "@/lib/community/topic-line";

describe("community v2 topic line (Phase 75)", () => {
  it("normalizes topic slugs", () => {
    expect(normalizeCommunityTopicSlug("Binder-Talk")).toBe("binder-talk");
    expect(normalizeCommunityTopicSlug("bad slug!")).toBeNull();
  });

  it("prefixes and splits topic metadata", () => {
    const full = withCommunityTopicLine("trades", "Looking for a swap partner.");
    expect(full.startsWith("[mca:topic:trades]\n")).toBe(true);
    expect(splitCommunityTopicBody(full).topic_slug).toBe("trades");
    expect(splitCommunityTopicBody(full).text).toBe("Looking for a swap partner.");
  });
});
