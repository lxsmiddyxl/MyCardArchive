"use client";

import type { NotificationListItem } from "@/lib/notifications/client-api";
import { fetchNotifications, markNotificationRead } from "@/lib/notifications/client-api";
import { applyNotificationRealtimeToItems } from "@/lib/notifications/realtime";
import { getRealtimePostgresClient, subscribeToNotifications } from "@/lib/realtime/channels";
import { McaVirtualList } from "@/components/ui/mca-virtual-list";
import { InlineError } from "@/mca-ui/inline-error";
import { Panel } from "@/mca-ui/panel";
import { NotificationListSkeleton } from "@/components/ui/skeleton";
import {
  useListRenderStats,
  useRealtimeEventCounter,
  useSuspenseProfile,
} from "@/lib/telemetry";
import Link from "next/link";
import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

function tradeHref(tradeId: string): string | null {
  if (!tradeId?.trim()) return null;
  return `/trades/${encodeURIComponent(tradeId)}`;
}

const NotificationRow = memo(function NotificationRow({
  n,
  onMarkRead,
}: {
  n: NotificationListItem;
  onMarkRead: (id: string) => void;
}) {
  const href = tradeHref(n.trade_id);
  return (
    <div
      role="listitem"
      className={`rounded-mca-block border-b border-mca-border/80 py-mca-md transition-colors duration-200 ease-mca-standard last:border-b-0 hover:bg-mca-surface-elevated/30 ${
        n.read_at ? "opacity-90" : ""
      }`}
    >
      <div className="px-mca-sm">
        {href ? (
          <Link
            href={href}
            className="block touch-manipulation rounded-mca-block text-mca-ink-strong underline-offset-2 outline-none transition-colors duration-200 ease-mca-standard hover:text-mca-accent hover:underline focus-visible:ring-2 focus-visible:ring-mca-focus/60"
            onClick={() => {
              if (!n.read_at) void onMarkRead(n.id);
            }}
          >
            <span className="text-mca-body font-medium">{n.title}</span>
          </Link>
        ) : (
          <p className="text-mca-body font-medium text-mca-ink-strong">{n.title}</p>
        )}
        {n.body ? <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">{n.body}</p> : null}
        <div className="mt-mca-xs flex flex-wrap items-center justify-between gap-mca-sm">
          <p className="text-mca-caption text-mca-hint">
            {n.type} · {new Date(n.created_at).toLocaleString()}
          </p>
          {!n.read_at ? (
            <button
              type="button"
              onClick={() => void onMarkRead(n.id)}
              className="touch-manipulation rounded-mca-control border border-mca-field-border bg-mca-surface-elevated/80 px-mca-compact py-mca-micro text-mca-caption font-semibold text-mca-ink-soft outline-none transition-all duration-200 ease-mca-standard hover:border-mca-border-interactive hover:bg-mca-chrome focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.98]"
            >
              Mark read
            </button>
          ) : (
            <span className="text-mca-caption text-mca-hint">Read</span>
          )}
        </div>
      </div>
    </div>
  );
});

export function NotificationsListClient() {
  const [items, setItems] = useState<NotificationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const telemetryCtx = useMemo(
    () => ({
      componentName: "NotificationsListClient",
      surfaceName: "notifications-panel",
    }),
    []
  );
  useSuspenseProfile("notifications-panel", telemetryCtx);
  useListRenderStats("notifications", items.length, telemetryCtx);
  const rtInc = useRealtimeEventCounter("notifications-realtime", telemetryCtx);
  /** After prepending a new row (newest-first), adjust scroll so the viewport does not jump. */
  const pendingScrollAdjustRef = useRef(false);
  const scrollBeforeInsertRef = useRef({ height: 0, y: 0 });
  const scrollParentRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const out = await fetchNotifications();
      if (!out.ok) throw new Error(out.error);
      setItems(out.notifications);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;
    void (async () => {
      const {
        data: { user },
      } = await getRealtimePostgresClient().auth.getUser();
      if (cancelled || !user) return;
      unsub = subscribeToNotifications(user.id, (payload) => {
        if (payload.eventType === "INSERT") {
          const el = scrollParentRef.current;
          scrollBeforeInsertRef.current = {
            height: el?.scrollHeight ?? document.documentElement.scrollHeight,
            y: el?.scrollTop ?? window.scrollY,
          };
          pendingScrollAdjustRef.current = true;
        }
        startTransition(() => {
          rtInc();
          setItems((prev) => applyNotificationRealtimeToItems(prev, payload));
        });
      });
    })();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [rtInc]);

  useLayoutEffect(() => {
    if (!pendingScrollAdjustRef.current) return;
    pendingScrollAdjustRef.current = false;
    const { height: beforeH, y: beforeY } = scrollBeforeInsertRef.current;
    const el = scrollParentRef.current;
    if (el) {
      const delta = el.scrollHeight - beforeH;
      if (delta > 0) {
        el.scrollTop = beforeY + delta;
      }
      return;
    }
    const afterH = document.documentElement.scrollHeight;
    const delta = afterH - beforeH;
    if (delta > 0) {
      window.scrollTo({ top: beforeY + delta, left: 0, behavior: "auto" });
    }
  }, [items]);

  const onMarkRead = useCallback(async (id: string) => {
    const out = await markNotificationRead(id);
    if (!out.ok) return;
    const readAt = new Date().toISOString();
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: readAt } : n))
    );
  }, []);

  return (
    <div className="space-y-mca-lg">
      <div>
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">Account</p>
        <h1 className="text-mca-display text-mca-ink-strong">Notifications</h1>
        <p className="mt-mca-sm max-w-2xl text-mca-body text-mca-ink-muted">
          Trades, messages, and other alerts for your account.
        </p>
      </div>

      <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
        {error ? <InlineError>{error}</InlineError> : null}
        {loading ? (
          <div role="status" aria-live="polite" className="space-y-mca-md">
            <span className="sr-only">Loading notifications</span>
            <p className="text-mca-body text-mca-ink-muted">Loading…</p>
            <NotificationListSkeleton rows={4} />
          </div>
        ) : items.length === 0 ? (
          <p className="text-mca-body text-mca-ink-subtle">No notifications yet.</p>
        ) : items.length <= 12 ? (
          <div
            ref={scrollParentRef}
            className="max-h-[min(70vh,560px)] overflow-y-auto overflow-x-hidden"
          >
            <div role="list">
              {items.map((n) => (
                <NotificationRow key={n.id} n={n} onMarkRead={onMarkRead} />
              ))}
            </div>
          </div>
        ) : (
          <McaVirtualList
            scrollRef={scrollParentRef}
            className="max-h-[min(70vh,560px)]"
            items={items}
            estimateSize={112}
            overscan={8}
            telemetry={{ name: "notifications", ctx: telemetryCtx }}
            getItemKey={(n) => n.id}
            renderItem={(n) => (
              <NotificationRow n={n} onMarkRead={onMarkRead} />
            )}
          />
        )}
      </Panel>
    </div>
  );
}
