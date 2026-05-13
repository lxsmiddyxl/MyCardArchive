import { describe, expect, it } from "vitest";
import { bandFromCounts, buildZoneHeatFromRoomRows } from "@/lib/presence/zone-heat-v3";

describe("presence v3 zone heat (Phase 74)", () => {
  it("bands counts into qualitative buckets", () => {
    expect(bandFromCounts(0, 0)).toBe("quiet");
    expect(bandFromCounts(30, 2)).toBe("gathering");
  });

  it("aggregates rooms and members by zone", () => {
    const heat = buildZoneHeatFromRoomRows(
      [
        { room_id: "a", room_type: "live_feed_room" },
        { room_id: "b", room_type: "live_feed_room" },
      ],
      [
        { room_id: "a", user_id: "u1" },
        { room_id: "a", user_id: "u2" },
        { room_id: "b", user_id: "u1" },
      ]
    );
    const live = heat.find((h) => h.zone === "live_feed_room");
    expect(live?.room_count).toBe(2);
    expect(live?.collector_bucket).not.toBe("quiet");
  });
});
