"use client";

import type { NotificationListItem } from "@/lib/notifications/client-api";
import { fetchNotifications, markNotificationRead } from "@/lib/notifications/client-api";
import { cn } from "@/lib/ui/cn";
import { Button } from "@/mca-ui/button";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

function hrefForNotification(n: NotificationListItem): string | null {
  if (n.trade_id?.trim()) return `/trades/${encodeURIComponent(n.trade_id)}`;
  const binderTypes = new Set([
    "binder_comment",
    "binder_reaction",
    "binder_subscribed",
    "binder_visibility_changed",
    "binder_card_added",
  ]);
  if (binderTypes.has(n.type)) return "/explore/binders";
  if (n.type === "binder_new_follower") return "/profile";
  return null;
}

export type NotificationsPanelProps = {
  className?: string;
  onUnreadChange?: (count: number) => void;
};

export function NotificationsPanel({ className, onUnreadChange }: NotificationsPanelProps) {
  const [items, setItems] = useState<NotificationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const out = await fetchNotifications();
      if (out.ok) {
        setItems(out.notifications);
        onUnreadChange?.(out.unreadCount);
      }
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = useCallback(
    async (id: string) => {
      await markNotificationRead(id);
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      onUnreadChange?.(items.filter((n) => n.id !== id && !n.read_at).length);
    },
    [items, onUnreadChange]
  );

  const markAllRead = useCallback(async () => {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    await load();
  }, [load]);

  return (
    <div className={cn("space-y-mca-sm", className)}>
      <div className="flex items-center justify-between gap-mca-sm">
        <p className="text-sm font-semibold text-mca-ink-body">Notifications</p>
        <Button type="button" variant="secondary" disabled={loading} onClick={() => void markAllRead()}>
          Mark all read
        </Button>
      </div>
      {loading ? <p className="text-sm text-mca-ink-muted">Loading…</p> : null}
      <ul className="max-h-80 space-y-mca-sm overflow-y-auto">
        {items.map((n) => {
          const href = hrefForNotification(n);
          const row = (
            <div
              className={cn(
                "rounded-mca-control border px-mca-sm py-mca-tight",
                n.read_at
                  ? "border-mca-border-subtle/60 bg-mca-chrome/20"
                  : "border-mca-accent-border/30 bg-mca-accent-border/10"
              )}
            >
              <p className="text-sm font-medium text-mca-ink-body">{n.title}</p>
              {n.body ? <p className="mt-mca-trace text-xs text-mca-ink-muted">{n.body}</p> : null}
            </div>
          );
          return (
            <li key={n.id}>
              {href ? (
                <Link href={href} onClick={() => void markRead(n.id)} className="block">
                  {row}
                </Link>
              ) : (
                <button type="button" className="block w-full text-left" onClick={() => void markRead(n.id)}>
                  {row}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {!loading && items.length === 0 ? (
        <p className="text-sm text-mca-ink-muted">You are all caught up.</p>
      ) : null}
    </div>
  );
}
