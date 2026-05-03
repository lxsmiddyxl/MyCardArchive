"use client";

import {
  fetchJson,
  fetchJsonErrorMessage,
  useAsyncState,
  useDebouncedSurfaceReload,
} from "@/lib/client";
import type {
  MarketEngineGraphDTO,
  MarketEngineLoop3DTO,
  MarketEngineLoop4DTO,
  MarketEnginePayloadDTO,
  MarketEngineTradePathDTO,
} from "@/lib/dto/market";
import { MARKET_SURFACES_REFRESH_EVENT } from "@/lib/market/market-surfaces-refresh";
import { Button } from "@/mca-ui/button";
import { Panel } from "@/mca-ui/panel";
import { useCallback, useEffect, useState } from "react";

type EngineView = {
  graph: MarketEngineGraphDTO | null;
  loops3: MarketEngineLoop3DTO[];
  loops4: MarketEngineLoop4DTO[];
};

function pathStableKey(p: MarketEngineTradePathDTO, i: number): string {
  return [
    p.kind ?? "",
    p.partner_user_id ?? "",
    p.middle_user_id ?? "",
    p.you_receive_catalog_id ?? "",
    p.you_send_catalog_id ?? "",
    String(i),
  ].join(":");
}

function pathLabel(p: MarketEngineTradePathDTO): string {
  const k = String(p.kind ?? "");
  if (k === "reciprocal") {
    return `Swap · partner ${String(p.partner_user_id ?? "").slice(0, 8)}… · receive ${String(p.you_receive_catalog_id ?? "").slice(0, 8)}… · send ${String(p.you_send_catalog_id ?? "").slice(0, 8)}…`;
  }
  if (k === "two_hop") {
    return `2-hop · via ${String(p.middle_user_id ?? "").slice(0, 8)}… · send ${String(p.you_send_catalog_id ?? "").slice(0, 8)}… · receive ${String(p.you_receive_catalog_id ?? "").slice(0, 8)}…`;
  }
  return JSON.stringify(p);
}

export function MarketEnginePanel() {
  const [bootstrapped, setBootstrapped] = useState(false);
  const { run, data, loading, error } = useAsyncState<EngineView>();

  const load = useCallback(() => {
    return run(async () => {
      const r = await fetchJson<MarketEnginePayloadDTO>("/api/market/engine", { cache: "no-store" });
      if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
      const body = r.data;
      return {
        graph: body.graph ?? null,
        loops3: Array.isArray(body.loops?.loops_3) ? body.loops.loops_3 : [],
        loops4: Array.isArray(body.loops?.loops_4) ? body.loops.loops_4 : [],
      };
    });
  }, [run]);

  useEffect(() => {
    void load().finally(() => setBootstrapped(true));
  }, [load]);

  const scheduleMarketReload = useDebouncedSurfaceReload(load, 180);

  useEffect(() => {
    const onRefresh = () => scheduleMarketReload();
    window.addEventListener(MARKET_SURFACES_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(MARKET_SURFACES_REFRESH_EVENT, onRefresh);
  }, [scheduleMarketReload]);

  const graph = data?.graph ?? null;
  const loops3 = data?.loops3 ?? [];
  const loops4 = data?.loops4 ?? [];

  if (!bootstrapped) {
    return (
      <Panel className="border-mca-border bg-mca-surface/35 p-mca-md">
        <section aria-live="polite" aria-busy>
          <p className="text-mca-caption text-mca-ink-muted">Loading marketplace engine…</p>
        </section>
      </Panel>
    );
  }

  if (error || graph?.error) {
    return (
      <Panel className="border-mca-border bg-mca-surface/35 p-mca-md">
        <p className="text-mca-caption text-mca-error-accent" role="alert">
          {error ?? graph?.error}
        </p>
      </Panel>
    );
  }

  const paths = Array.isArray(graph?.best_trade_paths) ? graph!.best_trade_paths! : [];
  const reciprocal = paths.filter((p) => p && typeof p === "object" && p.kind === "reciprocal");
  const twoHop = paths.filter((p) => p && typeof p === "object" && p.kind === "two_hop");

  return (
    <Panel className="border-mca-border bg-mca-surface-elevated/40 p-mca-md">
      <section aria-live="polite" aria-busy={loading}>
      <div className="flex flex-wrap items-center justify-between gap-mca-sm">
        <div>
          <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
            Marketplace engine
          </p>
          <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">
            FT→LF graph (Phase 81). Out {graph?.edge_count_out ?? 0} · In {graph?.edge_count_in ?? 0} edges.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void load()} className="transition-all duration-200 ease-mca-standard">
          Refresh
        </Button>
      </div>

      <div className="mt-mca-lg space-y-mca-md">
        <div>
          <p className="text-sm font-semibold text-mca-ink-strong">Best trade paths</p>
          <p className="mt-mca-trace text-mca-caption text-mca-ink-subtle">
            Direct swaps and two-hop chains that resolve cross-user FT/LF from your binder signals.
          </p>
          {paths.length === 0 ? (
            <p className="mt-mca-sm text-mca-caption text-mca-ink-subtle">No paths yet — set For trade / Looking for on catalog cards.</p>
          ) : (
            <ul className="mt-mca-sm space-y-mca-xs text-mca-caption text-mca-ink-body">
              {reciprocal.slice(0, 16).map((p, i) => (
                <li key={`r-${pathStableKey(p, i)}`} className="font-mono">
                  {pathLabel(p)}
                </li>
              ))}
              {twoHop.slice(0, 16).map((p, i) => (
                <li key={`t-${pathStableKey(p, i)}`} className="font-mono">
                  {pathLabel(p)}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-mca-ink-strong">Multi-party opportunities</p>
          <p className="mt-mca-trace text-mca-caption text-mca-ink-subtle">
            Directed loops where each hop is “you ship a card someone is looking for.”
          </p>
          {loops3.length === 0 && loops4.length === 0 ? (
            <p className="mt-mca-sm text-mca-caption text-mca-ink-subtle">No multi-party loops detected.</p>
          ) : (
            <ul className="mt-mca-sm space-y-mca-sm">
              {loops3.slice(0, 12).map((l, i) => (
                <li key={`3-${i}`} className="font-mono text-mca-caption text-mca-ink-body">
                  3-party · {l.u1.slice(0, 6)}… → {l.u2.slice(0, 6)}… → {l.u3.slice(0, 6)}… → {l.u1.slice(0, 6)}…
                </li>
              ))}
              {loops4.slice(0, 8).map((l, i) => (
                <li key={`4-${i}`} className="font-mono text-mca-caption text-mca-ink-body">
                  4-party · {l.u1.slice(0, 6)}… → {l.u2.slice(0, 6)}… → {l.u3.slice(0, 6)}… → {l.u4.slice(0, 6)}… →{" "}
                  {l.u1.slice(0, 6)}…
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      </section>
    </Panel>
  );
}
