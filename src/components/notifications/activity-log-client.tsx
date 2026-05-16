"use client";

import type { ActivityLogRecord } from "@/lib/notifications/db";
import { applyActivityLogRealtimeToRows } from "@/lib/notifications/activity-realtime";
import { fetchActivity } from "@/lib/notifications/client-api";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { getRealtimePostgresClient, subscribeToActivityLog } from "@/lib/realtime/channels";
import { McaVirtualList } from "@/components/ui/mca-virtual-list";
import { InlineError } from "@/mca-ui/inline-error";
import { EmptyStateActivity } from "@/mca-ui/empty-states/EmptyStateActivity";
import { Panel } from "@/mca-ui/panel";
import { ActivityLogSkeleton } from "@/components/ui/skeleton";
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

function formatMetadata(meta: ActivityLogRecord["metadata"]): string {
  try {
    return JSON.stringify(meta, null, 2);
  } catch {
    return String(meta);
  }
}

function showMetadata(meta: ActivityLogRecord["metadata"]): boolean {
  if (meta === null) return false;
  if (typeof meta === "object" && !Array.isArray(meta)) {
    return Object.keys(meta as Record<string, unknown>).length > 0;
  }
  return true;
}

const ActivityLogRow = memo(function ActivityLogRow({ r }: { r: ActivityLogRecord }) {
  return (
    <div role="listitem" className="border-b border-mca-border/80 py-mca-md last:border-b-0">
      <div className="flex flex-col gap-mca-xs sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-mca-caption text-mca-accent/90">{r.action}</p>
          <p className="mt-mca-xs text-mca-caption text-mca-ink-subtle">
            {new Date(r.created_at).toLocaleString()}
          </p>
          {r.trade_id ? (
            <p className="mt-mca-xs">
              <Link
                href={`/trades/${encodeURIComponent(r.trade_id)}`}
                className="touch-manipulation text-mca-caption font-medium text-mca-ink-muted underline-offset-2 outline-none transition-colors duration-200 ease-mca-standard hover:text-mca-accent hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-mca-focus/60"
              >
                Open trade
              </Link>
            </p>
          ) : null}
          {showMetadata(r.metadata) ? (
            <pre className="mt-mca-sm max-h-32 overflow-auto rounded-mca-block border border-mca-border/80 bg-mca-surface-elevated/50 p-mca-sm text-[11px] leading-relaxed text-mca-ink-subtle">
              {formatMetadata(r.metadata)}
            </pre>
          ) : null}
        </div>
      </div>
    </div>
  );
});

export function ActivityLogClient() {
  const [rows, setRows] = useState<ActivityLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const telemetryCtx = useMemo(
    () => ({
      componentName: "ActivityLogClient",
      surfaceName: "activity-log",
    }),
    []
  );
  useSuspenseProfile("activity-log", telemetryCtx);
  useListRenderStats("activity", rows.length, telemetryCtx);
  const rtInc = useRealtimeEventCounter("activity-realtime", telemetryCtx);
  const pendingScrollAdjustRef = useRef(false);
  const scrollBeforeInsertRef = useRef({ height: 0, y: 0 });
  const scrollParentRef = useRef<HTMLDivElement>(null);
  const socialActivityLoggedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const out = await fetchActivity();
      if (!out.ok) throw new Error(out.error);
      setRows(out.activity);
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
    if (loading) return;
    if (socialActivityLoggedRef.current) return;
    socialActivityLoggedRef.current = true;
    mcaLog.event(
      "social.activity.view",
      { surface: "activity-log", rowCount: rows.length },
      telemetryCtx
    );
  }, [loading, rows.length, telemetryCtx]);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;
    void (async () => {
      const {
        data: { user },
      } = await getRealtimePostgresClient().auth.getUser();
      if (cancelled || !user) return;
      unsub = subscribeToActivityLog(user.id, (payload) => {
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
          setRows((prev) => applyActivityLogRealtimeToRows(prev, payload));
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
  }, [rows]);

  return (
    <div className="space-y-mca-lg">
      <div>
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">Account</p>
        <h1 className="text-mca-display text-mca-ink-strong">Activity</h1>
        <p className="mt-mca-sm max-w-2xl text-mca-body text-mca-ink-muted">
          A chronological log of actions on your account (trades, messages, and more).
        </p>
      </div>

      <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
        {error ? <InlineError>{error}</InlineError> : null}
        {loading ? (
          <div role="status" aria-live="polite" className="space-y-mca-md">
            <span className="sr-only">Loading activity</span>
            <p className="text-mca-body text-mca-ink-muted">Loading…</p>
            <ActivityLogSkeleton rows={4} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyStateActivity />
        ) : rows.length <= 5 ? (
          <div
            ref={scrollParentRef}
            className="max-h-[min(70vh,560px)] overflow-y-auto overflow-x-hidden"
          >
            <div role="list">
              {rows.map((r) => (
                <ActivityLogRow key={r.id} r={r} />
              ))}
            </div>
          </div>
        ) : (
          <McaVirtualList
            scrollRef={scrollParentRef}
            className="max-h-[min(70vh,560px)]"
            items={rows}
            estimateSize={96}
            overscan={10}
            measureDynamic
            telemetry={{ name: "activity", ctx: telemetryCtx }}
            getItemKey={(r) => r.id}
            renderItem={(r) => <ActivityLogRow r={r} />}
          />
        )}
      </Panel>
    </div>
  );
}
