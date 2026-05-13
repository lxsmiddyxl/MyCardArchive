"use client";

import { fetchJson, fetchJsonErrorMessage, useAsyncState } from "@/lib/client";
import type { MarketplaceOfferV3DTO, MarketplaceReadonlyViewV3DTO } from "@/lib/dto/marketplace-v3";
import { Panel } from "@/mca-ui/panel";
import { useCallback, useEffect } from "react";

type ViewsPayload = { view: MarketplaceReadonlyViewV3DTO; offers_preview: MarketplaceOfferV3DTO[] };

/** Read-only qualitative marketplace snapshot (no payments). */
export function MarketV3ReadonlyPanel() {
  const { run, data, loading, error } = useAsyncState<ViewsPayload>();

  const load = useCallback(() => {
    return run(async () => {
      const r = await fetchJson<ViewsPayload>("/api/market/v3/views", { cache: "no-store" });
      if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
      return r.data;
    });
  }, [run]);

  useEffect(() => {
    void load();
  }, [load]);

  const view = data?.view;
  const offers = data?.offers_preview ?? [];

  return (
    <Panel className="border border-mca-border/80 bg-mca-surface-elevated/40 p-mca-md shadow-mca-panel">
      <p className="mca-typo-label text-mca-ink-muted">Marketplace v3 (read-only)</p>
      <h2 className="mt-mca-xs text-lg font-semibold text-mca-ink-strong">Signals & discovery</h2>
      <p className="mt-mca-sm text-sm text-mca-ink-body">
        Qualitative interest only — no checkout, no cash quotes. Use discovery routes for cards and completed
        trade rhythm.
      </p>
      {error ? (
        <p className="mt-mca-md text-sm text-mca-hint" role="alert">
          {error}
        </p>
      ) : null}
      {loading && !view ? <p className="mt-mca-md text-sm text-mca-ink-muted">Loading snapshot…</p> : null}
      {view ? (
        <dl className="mt-mca-md grid gap-mca-sm text-sm text-mca-ink-body sm:grid-cols-2">
          <div>
            <dt className="text-mca-caption text-mca-ink-muted">Open offer threads (yours)</dt>
            <dd className="font-semibold tabular-nums text-mca-ink-strong">{view.my_open_offer_threads}</dd>
          </div>
          <div>
            <dt className="text-mca-caption text-mca-ink-muted">Updated</dt>
            <dd className="text-mca-caption">{new Date(view.generated_at).toLocaleString()}</dd>
          </div>
        </dl>
      ) : null}
      {view && view.top_price_signals.length > 0 ? (
        <ul className="mt-mca-md space-y-mca-xs">
          {view.top_price_signals.slice(0, 5).map((s) => (
            <li
              key={s.catalog_card_id}
              className="rounded-mca-control border border-mca-border/60 bg-mca-chrome/25 px-mca-sm py-mca-trace text-mca-caption text-mca-ink-body"
            >
              <span className="font-semibold uppercase tracking-wide text-mca-ink-muted">{s.tone.replace(/_/g, " ")}</span>
              <span className="mx-mca-xs text-mca-ink-subtle">·</span>
              {s.caption}{" "}
              <span className="text-mca-ink-muted">({s.relative_interest_0_100}/100)</span>
            </li>
          ))}
        </ul>
      ) : null}
      {offers.length > 0 ? (
        <div className="mt-mca-md">
          <p className="text-mca-caption font-semibold uppercase tracking-wide text-mca-ink-muted">Recent offers</p>
          <ul className="mt-mca-xs space-y-mca-xs">
            {offers.map((o) => (
              <li key={o.id} className="text-mca-caption text-mca-ink-body">
                <span className="font-medium text-mca-ink-strong">{o.status}</span> — {o.summary_line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  );
}
