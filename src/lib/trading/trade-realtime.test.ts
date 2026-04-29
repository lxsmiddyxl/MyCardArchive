import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  applyTradeMessagesRealtime,
  tradeItemsRealtimeTargetsTradeId,
  tradesRealtimeTargetsTradeId,
} from "./trade-realtime";

function msgPayload(
  eventType: "INSERT" | "UPDATE" | "DELETE",
  row: Record<string, unknown>
): RealtimePostgresChangesPayload<Record<string, unknown>> {
  return {
    eventType,
    schema: "public",
    table: "trade_messages",
    commit_timestamp: new Date().toISOString(),
    new: eventType === "DELETE" ? {} : row,
    old: eventType === "INSERT" ? {} : row,
    errors: [],
  } as unknown as RealtimePostgresChangesPayload<Record<string, unknown>>;
}

describe("applyTradeMessagesRealtime", () => {
  it("inserts and sorts by createdAt", () => {
    const prev = [
      { id: "a", senderId: "u1", message: "hi", createdAt: "2024-01-01T00:00:00.000Z" },
    ];
    const p = msgPayload("INSERT", {
      id: "b",
      sender_id: "u2",
      message: "yo",
      created_at: "2023-12-31T00:00:00.000Z",
    });
    const next = applyTradeMessagesRealtime(prev, p);
    expect(next.map((m) => m.id)).toEqual(["b", "a"]);
  });

  it("dedupes same id on insert", () => {
    const prev = [{ id: "a", senderId: "u", message: "x", createdAt: "2024-01-01T00:00:00.000Z" }];
    const p = msgPayload("INSERT", {
      id: "a",
      sender_id: "u",
      message: "x",
      created_at: "2024-01-01T00:00:00.000Z",
    });
    expect(applyTradeMessagesRealtime(prev, p)).toHaveLength(1);
  });
});

describe("tradesRealtimeTargetsTradeId", () => {
  it("matches trade id on new row", () => {
    const p = {
      eventType: "UPDATE" as const,
      new: { id: "trade-1" },
      old: {},
    } as unknown as RealtimePostgresChangesPayload<Record<string, unknown>>;
    expect(tradesRealtimeTargetsTradeId("trade-1", p)).toBe(true);
    expect(tradesRealtimeTargetsTradeId("other", p)).toBe(false);
  });
});

describe("tradeItemsRealtimeTargetsTradeId", () => {
  it("matches trade_id on payload", () => {
    const p = {
      eventType: "INSERT" as const,
      new: { trade_id: "t1" },
      old: {},
    } as unknown as RealtimePostgresChangesPayload<Record<string, unknown>>;
    expect(tradeItemsRealtimeTargetsTradeId("t1", p)).toBe(true);
    expect(tradeItemsRealtimeTargetsTradeId("t2", p)).toBe(false);
  });
});
