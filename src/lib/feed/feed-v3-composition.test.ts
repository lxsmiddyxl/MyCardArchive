import { describe, expect, it } from "vitest";
import { buildFeedV3SupplementSignalLine, feedV3KindLabel } from "@/lib/feed/feed-v3-ui-copy";

describe("feed v3 composition (Phase 73)", () => {
  it("builds signal lines for supplement kinds", () => {
    expect(buildFeedV3SupplementSignalLine("showcase_created", { title: "Moonbreon wall" })?.includes("Moonbreon")).toBe(
      true
    );
    expect(buildFeedV3SupplementSignalLine("trade_completed", {})?.length).toBeGreaterThan(10);
    expect(buildFeedV3SupplementSignalLine("follow_edge_created", {})).toBeTruthy();
    expect(buildFeedV3SupplementSignalLine("post", {})).toBeNull();
  });

  it("maps kind labels for UI chips", () => {
    expect(feedV3KindLabel("showcase_created")).toBe("Showcase");
    expect(feedV3KindLabel("trade_completed")).toBe("Trade completed");
  });
});
