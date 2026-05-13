import { moderationTokensViolated } from "@/lib/community/content-guard";
import { describe, expect, it } from "vitest";

describe("content-guard (Phase 69)", () => {
  it("flags abusive phrases", () => {
    expect(moderationTokensViolated("hello")).toBe(false);
    expect(moderationTokensViolated("please kys")).toBe(true);
  });
});
