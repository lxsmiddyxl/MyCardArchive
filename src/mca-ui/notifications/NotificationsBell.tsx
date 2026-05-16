"use client";

import { fetchNotifications } from "@/lib/notifications/client-api";
import { NotificationsPanel } from "@/mca-ui/notifications/NotificationsPanel";
import { cn } from "@/lib/ui/cn";
import { useCallback, useEffect, useRef, useState } from "react";

export type NotificationsBellProps = {
  userId: string;
  className?: string;
};

export function NotificationsBell({ userId, className }: NotificationsBellProps) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const refreshUnread = useCallback(async () => {
    const out = await fetchNotifications();
    if (out.ok) setUnread(out.unreadCount);
  }, []);

  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread, userId]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label="Notifications"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-mca-pill border border-mca-border-subtle bg-mca-chrome/40 text-mca-ink-body transition duration-200 ease-mca-standard hover:bg-mca-chrome/70"
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden>🔔</span>
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-mca-accent-strong px-mca-trace text-[10px] font-bold text-mca-on-accent">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-mca-sm w-80 rounded-mca-card border border-mca-border-subtle bg-mca-surface p-mca-compact shadow-mca-panel">
          <NotificationsPanel onUnreadChange={setUnread} />
        </div>
      ) : null}
    </div>
  );
}
