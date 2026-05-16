import { describe, expect, it } from "vitest";
import { buildTradeRoomV2Payload, sanitizeTradeRoomMessage } from "@/lib/market/trade-room-v2";

describe("trade room v2 (Phase 82)", () => {
  it("strips HTML from messages", () => {
    expect(sanitizeTradeRoomMessage("<b>hello</b> world")).toBe("hello world");
  });

  it("builds room payload with participants", () => {
    const room = buildTradeRoomV2Payload({
      threadId: "t1",
      updatedAt: "2026-01-01T00:00:00.000Z",
      offers: [
        {
          id: "o1",
          thread_id: "t1",
          from_user_id: "u1",
          to_user_id: "u2",
          body: "Offer",
          status: "pending",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      messages: [{ id: "m1", actor_id: "u1", body: "Hi", created_at: "2026-01-01T00:01:00.000Z" }],
    });
    expect(room.participants).toEqual(["u1", "u2"]);
    expect(room.messages).toHaveLength(1);
    expect(room.offers).toHaveLength(1);
  });
});
