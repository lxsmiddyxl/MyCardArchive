"use client";

import { TradeStatusBadge } from "@/components/trading/trade-status-badge";
import { Field } from "@/mca-ui/field";
import { Icon } from "@/mca-ui/icon";
import { InlineError } from "@/mca-ui/inline-error";
import { Panel } from "@/mca-ui/panel";
import { fetchTradesList } from "@/lib/trading/client-api";
import { TRADES_LIST_REFETCH_DEBOUNCE_MS } from "@/lib/trading/trade-realtime";
import type { TradeRecord, TradeStatus } from "@/lib/trading/types";
import {
  devtoolsDebounceArm,
  devtoolsDebounceClear,
  devtoolsDebounceFire,
  devtoolsSilentRefetch,
} from "@/lib/dev/realtime-devtools-state";
import { McaIcons } from "@/lib/icons/mca-icons";
import { getRealtimePostgresClient, subscribeToTrades } from "@/lib/realtime/channels";
import { AuthenticatedPresenceShell, useAppWidePresence } from "@/components/realtime/app-wide-presence";
import { useListRenderStats, useSuspenseProfile } from "@/lib/telemetry";
import { cn } from "@/lib/ui/cn";
import { useMicroFlash } from "@/lib/ui/use-micro-flash";
import { McaVirtualList } from "@/components/ui/mca-virtual-list";
import { TradeListSkeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";

function isActiveStatus(s: TradeStatus): boolean {
  return s === "draft" || s === "sent" || s === "countered" || s === "accepted";
}

function isCompletedStatus(s: TradeStatus): boolean {
  return s === "completed" || s === "declined";
}

function tradePartnerId(trade: TradeRecord): string {
  return trade.viewerIsCreator ? trade.counterpartyId : trade.createdBy;
}

const TradeListRow = memo(function TradeListRow({
  trade,
  partnerOnline,
}: {
  trade: TradeRecord;
  partnerOnline: boolean;
}) {
  const count = trade.offerSideA.length + trade.offerSideB.length;
  return (
    <div role="listitem" className="pb-mca-sm">
      <Link
        href={`/trades/${encodeURIComponent(trade.id)}`}
        className="flex touch-manipulation flex-col gap-mca-sm rounded-mca-card border border-mca-border bg-mca-surface-elevated/50 p-mca-md outline-none transition-all duration-200 ease-mca-standard hover:border-mca-field-border hover:bg-mca-chrome/30 focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.99] sm:flex-row sm:items-center sm:justify-between"
      >
      <div>
        <p className="font-mono text-mca-caption text-mca-ink-subtle">{trade.id}</p>
        <p className="mt-mca-xs text-mca-body text-mca-ink-body">
          {count} card{count === 1 ? "" : "s"} · {trade.partyALabel} ↔ {trade.partyBLabel}
        </p>
        <p className="mt-mca-xs text-mca-caption text-mca-hint">
          Updated {new Date(trade.updatedAt).toLocaleString()}
        </p>
      </div>
      <div className="flex flex-col items-end gap-mca-xs">
        {partnerOnline ? (
          <span
            className="inline-flex items-center gap-mca-xs rounded-full border border-mca-focus/25 bg-mca-success-bold/10 px-mca-sm py-mca-trace text-mca-caption font-medium text-mca-success/95"
            title="This user is currently online"
          >
            <span className="size-1.5 rounded-full bg-mca-success/90" aria-hidden />
            Partner active
          </span>
        ) : null}
        <TradeStatusBadge status={trade.status} />
      </div>
      </Link>
    </div>
  );
});

export function TradesDashboardClient({ userId }: { userId: string }) {
  return (
    <AuthenticatedPresenceShell userId={userId}>
      <TradesDashboardBody />
    </AuthenticatedPresenceShell>
  );
}

function TradesDashboardBody() {
  const { isUserOnline } = useAppWidePresence();
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [binderFilter, setBinderFilter] = useState("all");
  const [setFilter, setSetFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const loadSeq = useRef(0);
  const { active: silentListFlash, trigger: triggerSilentListFlash } = useMicroFlash(200);

  const telemetryCtx = useMemo(
    () => ({
      componentName: "TradesDashboardBody",
      surfaceName: "trades-list",
    }),
    []
  );
  useSuspenseProfile("trades-dashboard", telemetryCtx);
  useListRenderStats("trades", trades.length, telemetryCtx);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const seq = ++loadSeq.current;
    if (!opts?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (binderFilter !== "all") params.set("binder", binderFilter);
      if (setFilter !== "all") params.set("set", setFilter);
      if (rarityFilter !== "all") params.set("rarity", rarityFilter);
      const q = params.toString();
      const out = await fetchTradesList(q ? `?${q}` : "");
      if (seq !== loadSeq.current) return;
      if (!out.ok) throw new Error(out.error);
      if (opts?.silent) {
        startTransition(() => setTrades(out.trades));
      } else {
        setTrades(out.trades);
      }
      if (opts?.silent && seq === loadSeq.current) {
        triggerSilentListFlash();
      }
    } catch (e) {
      if (seq !== loadSeq.current) return;
      setError(e instanceof Error ? e.message : "Failed to load trades");
    } finally {
      if (seq === loadSeq.current && !opts?.silent) {
        setLoading(false);
      }
    }
  }, [statusFilter, binderFilter, setFilter, rarityFilter, triggerSilentListFlash]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleRefetch = () => {
      clearTimeout(debounceTimer);
      devtoolsDebounceClear("trades-list");
      devtoolsDebounceArm("trades-list", "trades-list", TRADES_LIST_REFETCH_DEBOUNCE_MS);
      debounceTimer = setTimeout(() => {
        devtoolsDebounceFire("trades-list");
        devtoolsSilentRefetch("trades-list");
        void loadRef.current({ silent: true });
      }, TRADES_LIST_REFETCH_DEBOUNCE_MS);
    };

    void (async () => {
      const {
        data: { user },
      } = await getRealtimePostgresClient().auth.getUser();
      if (cancelled || !user) return;
      unsub = subscribeToTrades(user.id, scheduleRefetch);
    })();

    return () => {
      cancelled = true;
      clearTimeout(debounceTimer);
      devtoolsDebounceClear("trades-list");
      unsub?.();
    };
  }, []);

  const binderOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of trades) {
      for (const line of [...t.offerSideA, ...t.offerSideB]) {
        m.set(line.binderId, line.binderName ?? line.binderId);
      }
    }
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [trades]);

  const setOptions = useMemo(() => {
    const s = new Set<string>();
    for (const t of trades) {
      for (const line of [...t.offerSideA, ...t.offerSideB]) {
        if (line.setName) s.add(line.setName);
      }
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [trades]);

  const rarityOptions = useMemo(() => {
    const s = new Set<string>();
    for (const t of trades) {
      for (const line of [...t.offerSideA, ...t.offerSideB]) {
        if (line.rarity) s.add(line.rarity);
      }
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [trades]);

  const activeTrades = useMemo(
    () => trades.filter((t) => isActiveStatus(t.status)),
    [trades]
  );
  const completedTrades = useMemo(
    () => trades.filter((t) => isCompletedStatus(t.status)),
    [trades]
  );

  return (
    <div
      className={cn(
        "touch-manipulation space-y-mca-lg rounded-mca-card transition-[box-shadow,background-color] duration-200 ease-mca-standard",
        silentListFlash && "bg-mca-accent-strong/[0.03] shadow-[inset_0_0_0_1px_rgba(245,158,11,0.08)]"
      )}
    >
      <div className="flex flex-col gap-mca-md sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">Trading</p>
          <h1 className="text-mca-display text-mca-ink-strong">Trades</h1>
          <p className="mt-mca-sm max-w-2xl text-mca-body text-mca-ink-muted">
            Offers, counters, and completion are stored securely—only you and your trade partner can see
            a given trade.
          </p>
        </div>
        <Link
          href="/trades/new"
          className="inline-flex shrink-0 items-center justify-center gap-mca-sm rounded-mca-control border border-mca-accent-border/50 bg-mca-accent-strong/90 px-mca-base py-mca-tight text-sm font-semibold text-mca-on-accent shadow-mca-panel shadow-black/20 transition-all duration-200 ease-mca-standard hover:bg-mca-accent/95 hover:shadow-mca-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 focus-visible:ring-offset-2 focus-visible:ring-offset-mca-surface active:scale-[0.98]"
        >
          Create Trade
        </Link>
      </div>

      <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">Filters</p>
        <div className="mt-mca-md grid gap-mca-md sm:grid-cols-2 lg:grid-cols-4">
          <Field id="f-status" label="Status">
            <select
              id="f-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mca-input mt-0 w-full rounded-mca-card border-mca-border-subtle bg-mca-surface-elevated text-mca-body"
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="countered">Countered</option>
              <option value="accepted">Accepted</option>
              <option value="completed">Completed</option>
              <option value="declined">Declined</option>
            </select>
          </Field>
          <Field id="f-binder" label="Binder">
            <select
              id="f-binder"
              value={binderFilter}
              onChange={(e) => setBinderFilter(e.target.value)}
              className="mca-input mt-0 w-full rounded-mca-card border-mca-border-subtle bg-mca-surface-elevated text-mca-body"
            >
              <option value="all">All</option>
              {binderOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="f-set" label="Set">
            <select
              id="f-set"
              value={setFilter}
              onChange={(e) => setSetFilter(e.target.value)}
              className="mca-input mt-0 w-full rounded-mca-card border-mca-border-subtle bg-mca-surface-elevated text-mca-body"
            >
              <option value="all">All</option>
              {setOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="f-rarity" label="Rarity">
            <select
              id="f-rarity"
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value)}
              className="mca-input mt-0 w-full rounded-mca-card border-mca-border-subtle bg-mca-surface-elevated text-mca-body"
            >
              <option value="all">All</option>
              {rarityOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Panel>

      {error ? <InlineError>{error}</InlineError> : null}

      {loading ? (
        <div role="status" aria-live="polite" aria-busy="true" className="space-y-mca-md">
          <span className="sr-only">Loading trades</span>
          <p className="text-mca-body text-mca-ink-muted">Loading trades…</p>
          <TradeListSkeleton rows={5} />
        </div>
      ) : (
        <>
          <section>
            <h2 className="mb-mca-md text-mca-h2 text-mca-ink-strong">Active</h2>
            {activeTrades.length === 0 ? (
              <p className="text-mca-body text-mca-ink-subtle">No active trades for this filter.</p>
            ) : activeTrades.length <= 6 ? (
              <div role="list">
                {activeTrades.map((t) => (
                  <TradeListRow
                    key={t.id}
                    trade={t}
                    partnerOnline={isUserOnline(tradePartnerId(t))}
                  />
                ))}
              </div>
            ) : (
              <McaVirtualList
                className="max-h-[min(70vh,560px)]"
                items={activeTrades}
                estimateSize={136}
                overscan={6}
                getItemKey={(t) => t.id}
                renderItem={(t) => (
                  <TradeListRow
                    trade={t}
                    partnerOnline={isUserOnline(tradePartnerId(t))}
                  />
                )}
              />
            )}
          </section>
          <section>
            <h2 className="mb-mca-md text-mca-h2 text-mca-ink-strong">Completed</h2>
            {completedTrades.length === 0 ? (
              <p className="text-mca-body text-mca-ink-subtle">No completed trades for this filter.</p>
            ) : completedTrades.length <= 6 ? (
              <div role="list">
                {completedTrades.map((t) => (
                  <TradeListRow
                    key={t.id}
                    trade={t}
                    partnerOnline={isUserOnline(tradePartnerId(t))}
                  />
                ))}
              </div>
            ) : (
              <McaVirtualList
                className="max-h-[min(70vh,560px)]"
                items={completedTrades}
                estimateSize={136}
                overscan={6}
                getItemKey={(t) => t.id}
                renderItem={(t) => (
                  <TradeListRow
                    trade={t}
                    partnerOnline={isUserOnline(tradePartnerId(t))}
                  />
                )}
              />
            )}
          </section>
        </>
      )}

      {!loading && trades.length === 0 && !error ? (
        <div className="flex items-center gap-mca-sm rounded-mca-card border border-dashed border-mca-border-subtle bg-mca-surface-elevated/30 p-mca-lg text-mca-body text-mca-ink-subtle">
          <Icon src={McaIcons.system.info} size="md" alt="" />
          No trades yet — create one to get started.
        </div>
      ) : null}
    </div>
  );
}
