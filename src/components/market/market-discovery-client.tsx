"use client";

import {
  fetchJson,
  fetchJsonErrorMessage,
  useAsyncState,
  useDebouncedSurfaceReload,
} from "@/lib/client";
import type { MarketDiscoveryPayloadDTO } from "@/lib/dto/market";
import { MARKET_SURFACES_REFRESH_EVENT } from "@/lib/market/market-surfaces-refresh";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { Panel } from "@/mca-ui/panel";
import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

const EMPTY_DISCOVERY: MarketDiscoveryPayloadDTO = {
  want_by_catalog: [],
  offer_by_catalog: [],
  match_hints: [],
};

export const MarketDiscoveryClient = memo(function MarketDiscoveryClient() {
  const [bootstrapped, setBootstrapped] = useState(false);
  const [filterInput, setFilterInput] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");
  const [hintKind, setHintKind] = useState<string>("");
  const { run, data, loading, error } = useAsyncState<MarketDiscoveryPayloadDTO>();

  const load = useCallback(() => {
    return run(async () => {
      const r = await fetchJson<{ discovery?: MarketDiscoveryPayloadDTO | null }>("/api/market/discovery", {
        cache: "no-store",
      });
      if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
      return r.data.discovery ?? EMPTY_DISCOVERY;
    });
  }, [run]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedFilter(filterInput.trim().toLowerCase()), 320);
    return () => window.clearTimeout(t);
  }, [filterInput]);

  useEffect(() => {
    void load().finally(() => setBootstrapped(true));
  }, [load]);

  const scheduleMarketReload = useDebouncedSurfaceReload(load, 180);

  useEffect(() => {
    const onRefresh = () => scheduleMarketReload();
    window.addEventListener(MARKET_SURFACES_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(MARKET_SURFACES_REFRESH_EVENT, onRefresh);
  }, [scheduleMarketReload]);

  useEffect(() => {
    if (!data?.match_hints?.length) return;
    mcaLog.event(
      "market.match.view",
      { hintCount: data.match_hints.length },
      { componentName: "MarketDiscoveryClient", surfaceName: "marketplace" }
    );
  }, [data?.match_hints]);

  const wants = useMemo(() => {
    const raw = data?.want_by_catalog ?? [];
    if (!debouncedFilter) return raw;
    return raw.filter((w) => w.catalog_card_id.toLowerCase().includes(debouncedFilter));
  }, [data?.want_by_catalog, debouncedFilter]);

  const offers = useMemo(() => {
    const raw = data?.offer_by_catalog ?? [];
    if (!debouncedFilter) return raw;
    return raw.filter((o) => o.catalog_card_id.toLowerCase().includes(debouncedFilter));
  }, [data?.offer_by_catalog, debouncedFilter]);

  const matches = useMemo(() => {
    let m = data?.match_hints ?? [];
    if (hintKind) {
      m = m.filter((x) => x.match_kind === hintKind);
    }
    if (debouncedFilter) {
      m = m.filter((x) => x.catalog_card_id.toLowerCase().includes(debouncedFilter));
    }
    return m;
  }, [data?.match_hints, hintKind, debouncedFilter]);

  const hintKinds = useMemo(() => {
    const raw = data?.match_hints ?? [];
    const s = new Set<string>();
    for (const x of raw) {
      if (x.match_kind) s.add(x.match_kind);
    }
    return Array.from(s).sort();
  }, [data?.match_hints]);

  if (!bootstrapped) {
    return (
      <section aria-live="polite" aria-busy={loading}>
        <p className="text-mca-body text-mca-ink-muted">Loading marketplace signals…</p>
      </section>
    );
  }

  if (error) {
    return (
      <p className="text-mca-body text-mca-error-accent" role="alert">
        {error}
      </p>
    );
  }

  return (
    <div className="min-w-0 space-y-mca-xl overflow-x-hidden" aria-busy={loading}>
      <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          How it works
        </p>
        <p className="mt-mca-sm text-mca-body text-mca-ink-body">
          Mark individual cards <strong>For trade</strong> or <strong>Looking for</strong> in the card detail
          modal. This page rolls up anonymous counts — no exact binder listings are exposed here.
        </p>
        <p className="mt-mca-sm text-mca-caption text-mca-ink-muted">
          Browse aggregate demand and supply from{" "}
          <Link href="/market" className="font-medium text-mca-accent-strong/90 underline-offset-2 hover:text-mca-accent">
            Marketplace
          </Link>
          .
        </p>
      </Panel>

      <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Filter signals
        </p>
        <p className="mt-mca-xs text-mca-caption text-mca-hint">
          Client-side filter on catalog card ids (substring). RPC aggregates do not include price tiers — use
          card detail for monetary signals.
        </p>
        <div className="mt-mca-md flex flex-col gap-mca-sm sm:flex-row sm:flex-wrap sm:items-end">
          <label className="block min-w-[12rem] flex-1 text-mca-caption">
            <span className="font-medium text-mca-ink-muted">Catalog id contains</span>
            <input
              type="search"
              value={filterInput}
              onChange={(e) => setFilterInput(e.target.value)}
              placeholder="Filter lists…"
              className="mca-input mt-mca-micro rounded-mca-control font-mono text-sm"
            />
          </label>
          <label className="block min-w-[10rem] text-mca-caption">
            <span className="font-medium text-mca-ink-muted">Hint kind</span>
            <select
              value={hintKind}
              onChange={(e) => setHintKind(e.target.value)}
              className="mca-input mt-mca-micro rounded-mca-control text-sm"
            >
              <option value="">All kinds</option>
              {hintKinds.map((k) => (
                <option key={k} value={k}>
                  {k.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="rounded-mca-control border border-mca-border-subtle px-mca-compact py-mca-sm text-sm text-mca-ink-soft transition duration-200 ease-mca-standard hover:bg-mca-chrome/50"
            onClick={() => void load()}
          >
            Refresh data
          </button>
        </div>
      </Panel>

      <Panel className="border-mca-border bg-mca-surface-elevated/40 p-mca-md">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Match hints
        </p>
        <p className="mt-mca-xs text-mca-caption text-mca-hint">
          Overlap between your signals and others — directional hints only.
        </p>
        <span className="sr-only" aria-live="polite" aria-busy={loading}>
          {loading
            ? "Updating discovery."
            : `${matches.length} match hint${matches.length === 1 ? "" : "s"} shown.`}
        </span>
        {matches.length === 0 ? (
          <p className="mt-mca-md text-mca-caption text-mca-ink-subtle">No hints yet — expand your FT/LF signals.</p>
        ) : (
          <ul className="mt-mca-md space-y-mca-xs text-mca-caption text-mca-ink-body">
            {matches.slice(0, 24).map((m) => (
              <li key={`${m.catalog_card_id}-${m.match_kind}`} className="font-mono">
                {m.catalog_card_id.slice(0, 8)}… · {m.match_kind.replace(/_/g, " ")}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-mca-lg md:grid-cols-2">
        <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
          <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
            Top wants (catalog)
          </p>
          {wants.length === 0 ? (
            <p className="mt-mca-md text-mca-caption text-mca-ink-subtle">No aggregate want data yet.</p>
          ) : (
            <ul className="mt-mca-md space-y-mca-xs text-mca-caption text-mca-ink-body">
              {wants.slice(0, 12).map((w) => (
                <li key={w.catalog_card_id} className="flex justify-between gap-mca-sm font-mono">
                  <span className="truncate">{w.catalog_card_id.slice(0, 8)}…</span>
                  <span className="shrink-0 tabular-nums text-mca-ink-muted">
                    {w.collector_count} trainers · {w.card_count} signals
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
          <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
            Top offers (catalog)
          </p>
          {offers.length === 0 ? (
            <p className="mt-mca-md text-mca-caption text-mca-ink-subtle">No aggregate offer data yet.</p>
          ) : (
            <ul className="mt-mca-md space-y-mca-xs text-mca-caption text-mca-ink-body">
              {offers.slice(0, 12).map((o) => (
                <li key={o.catalog_card_id} className="flex justify-between gap-mca-sm font-mono">
                  <span className="truncate">{o.catalog_card_id.slice(0, 8)}…</span>
                  <span className="shrink-0 tabular-nums text-mca-ink-muted">
                    {o.collector_count} trainers · {o.card_count} signals
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
});
