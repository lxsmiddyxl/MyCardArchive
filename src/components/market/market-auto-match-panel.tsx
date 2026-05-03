"use client";

import {
  fetchJson,
  fetchJsonErrorMessage,
  useAsyncState,
  useDebouncedSurfaceReload,
} from "@/lib/client";
import type {
  MarketAutoMatchLoop3DTO,
  MarketAutoMatchPayloadDTO,
  MarketAutoMatchReciprocalDTO,
} from "@/lib/dto/market";
import { MARKET_SURFACES_REFRESH_EVENT } from "@/lib/market/market-surfaces-refresh";
import { Panel } from "@/mca-ui/panel";
import { useCallback, useEffect, useState } from "react";

type AutoMatchView = {
  reciprocal: MarketAutoMatchReciprocalDTO[];
  loops: MarketAutoMatchLoop3DTO[];
};

export function MarketAutoMatchPanel() {
  const [bootstrapped, setBootstrapped] = useState(false);
  const { run, data, loading, error } = useAsyncState<AutoMatchView>();

  const load = useCallback(() => {
    return run(async () => {
      const r = await fetchJson<MarketAutoMatchPayloadDTO>("/api/market/auto-match", {
        cache: "no-store",
      });
      if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
      const m = r.data.matches ?? {};
      return {
        reciprocal: Array.isArray(m.reciprocal) ? m.reciprocal : [],
        loops: Array.isArray(m.loops_3) ? m.loops_3 : [],
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

  const reciprocal = data?.reciprocal ?? [];
  const loops = data?.loops ?? [];

  if (!bootstrapped) {
    return (
      <Panel className="border-mca-border bg-mca-surface/35 p-mca-md">
        <section aria-live="polite" aria-busy>
          <p className="text-mca-caption text-mca-ink-muted">Loading auto-match…</p>
        </section>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel className="border-mca-border bg-mca-surface/35 p-mca-md">
        <p className="text-mca-caption text-mca-error-accent" role="alert">
          {error}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="border-mca-border bg-mca-surface-elevated/40 p-mca-md">
      <section aria-live="polite" aria-busy={loading}>
      <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
        Auto-match suggestions
      </p>
      <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">
        Reciprocal pairs from your For trade / Looking for signals. Three-way loops are best-effort graph
        hints.
      </p>

      {reciprocal.length === 0 && loops.length === 0 ? (
        <p className="mt-mca-md text-mca-caption text-mca-ink-subtle">No structured matches right now.</p>
      ) : null}

      {reciprocal.length > 0 ? (
        <div className="mt-mca-md">
          <p className="text-sm font-medium text-mca-ink-strong">Reciprocal FT/LF</p>
          <ul className="mt-mca-sm space-y-mca-xs text-mca-caption text-mca-ink-body">
            {reciprocal.slice(0, 12).map((r, i) => (
              <li key={`${r.other_user_id}-${r.you_receive_catalog_id}-${i}`} className="font-mono">
                vs {r.other_user_id.slice(0, 8)}… · you get {r.you_receive_catalog_id.slice(0, 8)}… · you send{" "}
                {r.you_send_catalog_id.slice(0, 8)}…
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {loops.length > 0 ? (
        <div className="mt-mca-md">
          <p className="text-sm font-medium text-mca-ink-strong">3-user loops</p>
          <ul className="mt-mca-sm space-y-mca-xs text-mca-caption text-mca-ink-body">
            {loops.slice(0, 8).map((l, i) => (
              <li key={`${l.u1}-${l.u2}-${l.u3}-${i}`} className="font-mono">
                {l.u1.slice(0, 6)}… → {l.u2.slice(0, 6)}… → {l.u3.slice(0, 6)}… → {l.u1.slice(0, 6)}…
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      </section>
    </Panel>
  );
}
