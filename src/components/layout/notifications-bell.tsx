"use client";

import type { NotificationListItem } from "@/lib/notifications/client-api";
import { fetchNotifications, markNotificationRead } from "@/lib/notifications/client-api";
import {
  applyNotificationRealtimeToItems,
  unreadDeltaUsingLocalItems,
} from "@/lib/notifications/realtime";
import { subscribeToNotifications } from "@/lib/realtime/channels";
import { log } from "@/lib/logging/log";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { cn } from "@/lib/ui/cn";
import { useMicroFlash } from "@/lib/ui/use-micro-flash";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

function tradeHref(tradeId: string): string | null {
  if (!tradeId?.trim()) return null;
  return `/trades/${encodeURIComponent(tradeId)}`;
}

type NotifFeedState = {
  items: NotificationListItem[];
  unread: number;
};

export function NotificationsBell({
  userId,
  variant = "default",
}: {
  userId: string;
  /** `icon` — compact control for the header bar */
  variant?: "default" | "icon";
}) {
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState<NotifFeedState>({ items: [], unread: 0 });
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const prevOpenRef = useRef(false);
  const { active: bellPulse, trigger: triggerBellPulse } = useMicroFlash(260);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const out = await fetchNotifications();
      if (out.ok) {
        setFeed({ items: out.notifications, unread: out.unreadCount });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const unsub = subscribeToNotifications(userId, (payload) => {
      if (payload.eventType === "INSERT") {
        const row = payload.new as Record<string, unknown> | undefined;
        const id = row && typeof row.id === "string" ? row.id : undefined;
        const type = row && typeof row.type === "string" ? row.type : undefined;
        log.notifications.info("insert", { id, type });
        if (type === "market_watch_ft" || type === "market_trade_overlap") {
          mcaLog.event(
            "market.alert.trigger",
            { type, notificationId: id },
            { componentName: "NotificationsBell", surfaceName: "marketplace" }
          );
        }
      }
      if (!openRef.current && payload.eventType === "INSERT") {
        triggerBellPulse();
      }
      setFeed((prev) => {
        const nextItems = applyNotificationRealtimeToItems(prev.items, payload);
        const delta = unreadDeltaUsingLocalItems(prev.items, payload);
        const nextUnread = delta !== 0 ? Math.max(0, prev.unread + delta) : prev.unread;
        return { items: nextItems, unread: nextUnread };
      });
    });
    return unsub;
  }, [userId, triggerBellPulse]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (prevOpenRef.current && !open) {
      mcaLog.event(
        "notification.dismissed",
        { source: "notifications-bell", userId },
        { componentName: "layout", surfaceName: "notifications-bell" }
      );
    }
    prevOpenRef.current = open;
  }, [open, userId]);

  const onMarkRead = async (id: string) => {
    const out = await markNotificationRead(id);
    if (out.ok) void load();
  };

  const { items, unread } = feed;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          void load();
        }}
        className={cn(
          "relative mca-nav-focus-ring rounded-mca-control border border-mca-field-border bg-mca-surface-elevated/80 text-mca-ink-body transition-all duration-200 ease-mca-standard hover:border-mca-accent-strong/40 hover:bg-mca-chrome hover:text-mca-ink-strong focus-visible:outline-none",
          variant === "icon"
            ? "inline-flex h-10 w-10 items-center justify-center p-0"
            : "px-mca-tight py-mca-micro text-xs font-semibold",
          bellPulse && "ring-2 ring-mca-accent/35 ring-offset-2 ring-offset-mca-surface"
        )}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Notifications"
      >
        {variant === "icon" ? (
          <>
            <svg
              className="h-5 w-5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </>
        ) : (
          "Notifications"
        )}
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-mca-accent-strong px-mca-trace text-[10px] font-bold text-mca-on-accent">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-[100] mt-mca-micro w-80 max-w-[calc(100vw-2rem)] rounded-mca-card border border-mca-border-subtle bg-mca-surface p-mca-sm shadow-mca-card">
          <p className="border-b border-mca-border px-mca-xs pb-mca-sm text-mca-caption font-semibold uppercase tracking-wide text-mca-ink-subtle">
            Recent
          </p>
          {loading ? (
            <p className="p-mca-md text-mca-caption text-mca-ink-subtle">Loading…</p>
          ) : items.length === 0 ? (
            <p className="p-mca-md text-mca-caption text-mca-ink-subtle">No notifications yet.</p>
          ) : (
            <ul className="max-h-72 space-y-mca-xs overflow-y-auto py-mca-sm">
              {items.slice(0, 8).map((n) => {
                const href = tradeHref(n.trade_id);
                const inner = (
                  <>
                    <p className="text-mca-caption font-medium text-mca-ink-strong">{n.title}</p>
                    {n.body ? (
                      <p className="mt-mca-xs line-clamp-2 text-mca-caption text-mca-ink-subtle">{n.body}</p>
                    ) : null}
                    <p className="mt-mca-xs text-[10px] text-mca-hint">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </>
                );
                return (
                  <li key={n.id}>
                    {href ? (
                      <Link
                        href={href}
                        onClick={() => {
                          if (!n.read_at) void onMarkRead(n.id);
                          setOpen(false);
                        }}
                        className={`block rounded-mca-block px-mca-sm py-mca-xs transition-colors duration-200 ease-mca-standard hover:bg-mca-surface-elevated ${
                          n.read_at ? "opacity-70" : ""
                        }`}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!n.read_at) void onMarkRead(n.id);
                        }}
                        className={`w-full rounded-mca-block px-mca-sm py-mca-xs text-left transition-colors duration-200 ease-mca-standard hover:bg-mca-surface-elevated ${
                          n.read_at ? "opacity-70" : ""
                        }`}
                      >
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t border-mca-border pt-mca-sm">
            <div className="flex flex-wrap gap-mca-sm px-mca-xs">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-mca-caption font-medium text-mca-accent/90 transition hover:text-mca-accent-highlight"
              >
                All notifications
              </Link>
              <Link
                href="/activity"
                onClick={() => setOpen(false)}
                className="text-mca-caption font-medium text-mca-ink-subtle transition hover:text-mca-ink-body"
              >
                Activity
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
