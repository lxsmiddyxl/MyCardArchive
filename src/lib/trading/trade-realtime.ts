/**
 * Realtime merge helpers for trades.
 *
 * **`trade_messages`:** rows are merged into React state via {@link applyTradeMessagesRealtime}.
 *
 * **`trade_items`:** the UI does not merge rows client-side. {@link TRADE_ITEMS_DETAIL_MERGE_DEBOUNCE_MS}
 * coalesces `postgres_changes` bursts, then `fetchTradeItemsSides` refetches offer sides from
 * `GET /api/trades/[id]/items` — consistent with migration `039_trade_items_realtime_publication.sql`.
 */
import type { TradeMessage } from "@/lib/trading/types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

function tradeMessageFromRow(row: Record<string, unknown> | undefined | null): TradeMessage | null {
  if (!row || typeof row.id !== "string") return null;
  const senderId = typeof row.sender_id === "string" ? row.sender_id : "";
  const message = typeof row.message === "string" ? row.message : "";
  const createdAt = typeof row.created_at === "string" ? row.created_at : "";
  return { id: row.id, senderId, message, createdAt };
}

/** Merge postgres_changes for `trade_messages` into an ordered list (oldest first). */
export function applyTradeMessagesRealtime(
  prev: TradeMessage[] | undefined,
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>
): TradeMessage[] {
  const list = prev ?? [];
  if (payload.eventType === "INSERT") {
    const m = tradeMessageFromRow(payload.new as Record<string, unknown>);
    if (!m) return list;
    if (list.some((x) => x.id === m.id)) return list;
    const next = [...list, m];
    next.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return next;
  }
  if (payload.eventType === "UPDATE") {
    const m = tradeMessageFromRow(payload.new as Record<string, unknown>);
    if (!m) return list;
    return list.map((x) => (x.id === m.id ? m : x));
  }
  if (payload.eventType === "DELETE") {
    const id = (payload.old as Record<string, unknown> | undefined)?.id;
    if (typeof id !== "string") return list;
    return list.filter((x) => x.id !== id);
  }
  return list;
}

export function tradesRealtimeTargetsTradeId(
  tradeId: string,
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>
): boolean {
  const id =
    (payload.new as Record<string, unknown> | undefined)?.id ??
    (payload.old as Record<string, unknown> | undefined)?.id;
  return typeof id === "string" && id === tradeId;
}

export function tradeItemsRealtimeTargetsTradeId(
  tradeId: string,
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>
): boolean {
  const tid =
    (payload.new as Record<string, unknown> | undefined)?.trade_id ??
    (payload.old as Record<string, unknown> | undefined)?.trade_id;
  return typeof tid === "string" && tid === tradeId;
}

/** Debounce for trades list refetch after postgres_changes on `trades` (ms). */
export const TRADES_LIST_REFETCH_DEBOUNCE_MS = 350;

/** Coalesce `trade_items` events before a single sides fetch on trade detail (ms). */
export const TRADE_ITEMS_DETAIL_MERGE_DEBOUNCE_MS = 150;
