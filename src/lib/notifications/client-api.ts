import type { ActivityLogRecord } from "@/lib/notifications/db";

const json = async <T>(res: Response): Promise<T> => {
  return (await res.json().catch(() => ({}))) as T;
};

export type NotificationListItem = {
  id: string;
  user_id: string;
  type: string;
  kind: string;
  title: string;
  body: string | null;
  trade_id: string;
  read_at: string | null;
  created_at: string;
};

export async function fetchNotifications(): Promise<
  | { ok: true; notifications: NotificationListItem[]; unreadCount: number }
  | { ok: false; error: string }
> {
  const res = await fetch("/api/notifications/list", {
    cache: "no-store",
    credentials: "include",
  });
  const body = await json<{
    notifications?: NotificationListItem[];
    unreadCount?: number;
    error?: string;
  }>(res);
  if (!res.ok) return { ok: false, error: body.error ?? "Failed to load notifications" };
  return {
    ok: true,
    notifications: Array.isArray(body.notifications) ? body.notifications : [],
    unreadCount: typeof body.unreadCount === "number" ? body.unreadCount : 0,
  };
}

export async function markNotificationRead(
  notificationId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`/api/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "PATCH",
    credentials: "include",
  });
  const body = await json<{ ok?: boolean; error?: string }>(res);
  if (!res.ok) return { ok: false, error: body.error ?? "Failed to mark read" };
  return { ok: true };
}

export async function fetchActivity(): Promise<
  { ok: true; activity: ActivityLogRecord[] } | { ok: false; error: string }
> {
  const res = await fetch("/api/activity/list", {
    cache: "no-store",
    credentials: "include",
  });
  const body = await json<{ activity?: ActivityLogRecord[]; error?: string }>(res);
  if (!res.ok) return { ok: false, error: body.error ?? "Failed to load activity" };
  return {
    ok: true,
    activity: Array.isArray(body.activity) ? body.activity : [],
  };
}
