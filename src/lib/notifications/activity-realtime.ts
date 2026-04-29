import type { ActivityLogRecord } from "@/lib/notifications/db";
import type { Json } from "@/lib/supabase/types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

function rowFromPayload(row: Record<string, unknown> | undefined | null): ActivityLogRecord | null {
  if (!row || typeof row.id !== "string") return null;
  return {
    id: row.id,
    user_id: typeof row.user_id === "string" ? row.user_id : "",
    action: typeof row.action === "string" ? row.action : "",
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    metadata: (row.metadata ?? null) as Json,
    trade_id: row.trade_id == null || row.trade_id === "" ? null : String(row.trade_id),
  };
}

/** Merge postgres_changes into an activity list (newest first, same as {@link getUserActivity}). */
export function applyActivityLogRealtimeToRows(
  prev: ActivityLogRecord[],
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>
): ActivityLogRecord[] {
  if (payload.eventType === "INSERT") {
    const item = rowFromPayload(payload.new as Record<string, unknown>);
    if (!item) return prev;
    return [item, ...prev.filter((x) => x.id !== item.id)];
  }
  if (payload.eventType === "UPDATE") {
    const item = rowFromPayload(payload.new as Record<string, unknown>);
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
