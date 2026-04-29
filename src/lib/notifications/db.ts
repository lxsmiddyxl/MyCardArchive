import { logger } from "@/lib/telemetry/logger";
import type { Database, Json } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationRecord = Database["public"]["Tables"]["notifications"]["Row"];
export type ActivityLogRecord = Database["public"]["Tables"]["activity_log"]["Row"];

const NOTIFICATION_SELECT_LIMIT = 200;
const ACTIVITY_SELECT_LIMIT = 500;

/**
 * Inserts a notification for `userId`. Under RLS this succeeds only when the Supabase
 * client is authenticated as `userId` (recipient is the current user).
 */
export async function createNotification(
  supabase: SupabaseClient<Database>,
  userId: string,
  type: string,
  title: string,
  body?: string | null,
  tradeId?: string | null
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!userId?.trim() || !type?.trim() || !title?.trim()) {
    return { ok: false, error: "userId, type, and title are required." };
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      type: type.trim(),
      title: title.trim(),
      body: body != null && body !== "" ? body : null,
      trade_id: tradeId ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    logger.warn({
      eventType: "notification.created",
      userId,
      success: false,
      payloadSummary: { type: type.trim(), tradeId: tradeId ?? null },
    });
    return { ok: false, error: error?.message ?? "Could not create notification." };
  }
  logger.info({
    eventType: "notification.created",
    userId,
    success: true,
    payloadSummary: { notificationId: data.id, type: type.trim(), tradeId: tradeId ?? null },
  });
  return { ok: true, id: data.id };
}

/** Lists notifications for the user (newest first). RLS applies for the session user. */
export async function getUserNotifications(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<NotificationRecord[]> {
  if (!userId?.trim()) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(NOTIFICATION_SELECT_LIMIT);

  if (error || !data) return [];
  return data as NotificationRecord[];
}

/**
 * Sets `read_at` on a notification. Only `read_at` may change per DB trigger; RLS requires
 * the row to belong to `userId` (typically `auth.uid()`).
 */
export async function markNotificationRead(
  supabase: SupabaseClient<Database>,
  notificationId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!notificationId?.trim() || !userId?.trim()) {
    return { ok: false, error: "notificationId and userId are required." };
  }

  const readAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: readAt })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    logger.warn({
      eventType: "notification.read",
      userId,
      success: false,
      payloadSummary: { notificationId },
    });
    return { ok: false, error: error.message };
  }
  if (!data) {
    logger.warn({
      eventType: "notification.read",
      userId,
      success: false,
      payloadSummary: { notificationId },
    });
    return { ok: false, error: "Notification not found." };
  }
  logger.info({
    eventType: "notification.read",
    userId,
    success: true,
    payloadSummary: { notificationId: data.id },
  });
  return { ok: true };
}

/**
 * Appends an activity row for `userId`. RLS allows insert only when `auth.uid()` = `userId`.
 */
export async function logActivity(
  supabase: SupabaseClient<Database>,
  userId: string,
  action: string,
  tradeId?: string | null,
  metadata?: Json
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!userId?.trim() || !action?.trim()) {
    return { ok: false, error: "userId and action are required." };
  }

  const { data, error } = await supabase
    .from("activity_log")
    .insert({
      user_id: userId,
      action: action.trim(),
      trade_id: tradeId ?? null,
      metadata: metadata ?? {},
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not log activity." };
  }
  return { ok: true, id: data.id };
}

/** Lists activity for the user (newest first). RLS applies for the session user. */
export async function getUserActivity(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<ActivityLogRecord[]> {
  if (!userId?.trim()) return [];

  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(ACTIVITY_SELECT_LIMIT);

  if (error || !data) return [];
  return data as ActivityLogRecord[];
}
