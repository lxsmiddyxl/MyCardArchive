import type { NotificationListItem } from "@/lib/notifications/client-api";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

function listItemFromRow(row: Record<string, unknown> | undefined | null): NotificationListItem | null {
  if (!row || typeof row.id !== "string") return null;
  const type = typeof row.type === "string" ? row.type : "";
  return {
    id: row.id,
    user_id: typeof row.user_id === "string" ? row.user_id : "",
    type,
    kind: type,
    title: typeof row.title === "string" ? row.title : "",
    body: row.body == null ? null : String(row.body),
    trade_id: row.trade_id == null || row.trade_id === "" ? "" : String(row.trade_id),
    read_at: row.read_at == null ? null : String(row.read_at),
    created_at: typeof row.created_at === "string" ? row.created_at : "",
  };
}

/** Merge postgres_changes into a notification list (newest-first order preserved for inserts). */
export function applyNotificationRealtimeToItems(
  prev: NotificationListItem[],
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>
): NotificationListItem[] {
  if (payload.eventType === "INSERT") {
    const item = listItemFromRow(payload.new as Record<string, unknown>);
    if (!item) return prev;
    return [item, ...prev.filter((x) => x.id !== item.id)];
  }
  if (payload.eventType === "UPDATE") {
    const item = listItemFromRow(payload.new as Record<string, unknown>);
    if (!item) return prev;
    return prev.map((x) => (x.id === item.id ? item : x));
  }
  if (payload.eventType === "DELETE") {
    const id = (payload.old as Record<string, unknown> | undefined)?.id;
    if (typeof id !== "string") return prev;
    return prev.filter((x) => x.id !== id);
  }
  return prev;
}

/**
 * Unread count delta using current list state so UPDATE works even when Realtime
 * `old` omits columns (replica identity).
 */
export function unreadDeltaUsingLocalItems(
  prevItems: NotificationListItem[],
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>
): number {
  if (payload.eventType === "INSERT") {
    const item = listItemFromRow(payload.new as Record<string, unknown>);
    return item && item.read_at == null ? 1 : 0;
  }
  if (payload.eventType === "UPDATE") {
    const newItem = listItemFromRow(payload.new as Record<string, unknown>);
    if (!newItem) return 0;
    const oldItem = prevItems.find((x) => x.id === newItem.id);
    if (oldItem && !oldItem.read_at && newItem.read_at) return -1;
    return 0;
  }
  if (payload.eventType === "DELETE") {
    const id = (payload.old as Record<string, unknown> | undefined)?.id;
    if (typeof id !== "string") return 0;
    const oldItem = prevItems.find((x) => x.id === id);
    return oldItem?.read_at == null ? -1 : 0;
  }
  return 0;
}
