import { pickFollowBackCandidates } from "@/lib/social/follow-back-hints";
import { describe, expect, it } from "vitest";

describe("follow-back-hints (Phase 66)", () => {
  it("returns users you follow who do not follow back", () => {
    const me = "u0";
    const iFollow = new Set(["a", "b", "c"]);
    const followsMe = new Set(["b"]);
    expect(pickFollowBackCandidates({ iFollow, followsMe, myId: me })).toEqual(["a", "c"]);
  });
});
