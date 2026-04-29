"use client";

import { mcaLog } from "@/lib/logging/mca-log-client";
import { Panel } from "@/mca-ui/panel";
import Link from "next/link";
import { memo, useEffect, useState } from "react";

type CatalogAggRow = {
  catalog_card_id: string;
  card_count: number;
  collector_count: number;
};

type MatchRow = {
  catalog_card_id: string;
  match_kind: "you_lf_they_ft" | "you_ft_they_lf" | string;
};

type DiscoveryPayload = {
  want_by_catalog: CatalogAggRow[] | null;
  offer_by_catalog: CatalogAggRow[] | null;
  match_hints: MatchRow[] | null;
};

export const MarketDiscoveryClient = memo(function MarketDiscoveryClient() {
  const [data, setData] = useState<DiscoveryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/market/discovery", { cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as {
          discovery?: DiscoveryPayload;
          error?: string;
        };
        if (!res.ok) throw new Error(body.error ?? "Failed to load");
        if (!cancelled) setData(body.discovery ?? null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!data?.match_hints?.length) return;
    mcaLog.event(
      "market.match.view",
      { hintCount: data.match_hints.length },
      { componentName: "MarketDiscoveryClient", surfaceName: "marketplace" }
    );
  }, [data?.match_hints]);

  if (loading) {
    return <p className="text-mca-body text-mca-ink-muted">Loading marketplace signals…</p>;
  }

  if (error) {
    return <p className="text-mca-body text-mca-error-accent">{error}</p>;
  }

  const wants = data?.want_by_catalog ?? [];
  const offers = data?.offer_by_catalog ?? [];
  const matches = data?.match_hints ?? [];

  return (
    <div className="space-y-mca-xl">
      <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          How it works
        </p>
        <p className="mt-mca-sm text-mca-body text-mca-ink-body">
          Mark individual cards <strong>For trade</strong> or <strong>Looking for</strong> in the card detail
          modal (catalog-linked cards only). This screen shows <strong>aggregate</strong> demand and supply by
          catalog card — no trades execute here yet.
        </p>
        <Link
          href="/cards"
          className="mt-mca-md inline-block text-mca-caption font-medium text-mca-accent-strong/90 transition duration-200 ease-mca-standard hover:text-mca-accent"
        >
          Open All Cards →
        </Link>
      </Panel>

      <Panel className="border-mca-border bg-mca-surface-elevated/40 p-mca-md">
        <div className="flex flex-col text-left">
          <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
            Potential matches for you
          </p>
          <p className="mt-mca-xs text-mca-caption text-mca-hint">
            Catalog cards where your haves/wants overlap with other collectors ({matches.length}).
          </p>
        </div>
        {matches.length === 0 ? (
          <p className="mt-mca-md text-mca-caption text-mca-ink-subtle">
            No overlap yet — add For trade / Looking for on catalog-linked cards.
          </p>
        ) : (
          <ul className="mt-mca-md space-y-mca-sm">
            {matches.slice(0, 40).map((m) => (
              <li
                key={`${m.catalog_card_id}-${m.match_kind}`}
                className="rounded-mca-control border border-mca-border/80 bg-mca-surface/50 px-mca-sm py-mca-xs font-mono text-mca-caption text-mca-ink-body"
              >
                {m.catalog_card_id}{" "}
                <span className="text-mca-ink-muted">
                  ·{" "}
                  {m.match_kind === "you_lf_they_ft"
                    ? "You want · others offer"
                    : m.match_kind === "you_ft_they_lf"
                      ? "You offer · others want"
                      : m.match_kind}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-mca-lg md:grid-cols-2">
        <Panel className="border-mca-border bg-mca-surface/35 p-mca-md">
          <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
            Cards collectors want
          </p>
          <p className="mt-mca-xs text-mca-caption text-mca-hint">Top catalog ids by distinct collectors.</p>
          {wants.length === 0 ? (
            <p className="mt-mca-md text-mca-caption text-mca-ink-subtle">No looking-for signals yet.</p>
          ) : (
            <ul className="mt-mca-md max-h-80 space-y-mca-sm overflow-y-auto">
              {wants.slice(0, 50).map((w) => (
                <li
                  key={w.catalog_card_id}
                  className="rounded-mca-control border border-mca-border/60 px-mca-sm py-mca-xs font-mono text-mca-caption text-mca-ink-body"
                >
                  {w.catalog_card_id}
                  <span className="text-mca-ink-muted">
                    {" "}
                    · {w.collector_count} collectors · {w.card_count} rows
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="border-mca-border bg-mca-surface/35 p-mca-md">
          <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
            Cards offered for trade
          </p>
          <p className="mt-mca-xs text-mca-caption text-mca-hint">Top catalog ids by distinct collectors.</p>
          {offers.length === 0 ? (
            <p className="mt-mca-md text-mca-caption text-mca-ink-subtle">No for-trade signals yet.</p>
          ) : (
            <ul className="mt-mca-md max-h-80 space-y-mca-sm overflow-y-auto">
              {offers.slice(0, 50).map((o) => (
                <li
                  key={o.catalog_card_id}
                  className="rounded-mca-control border border-mca-border/60 px-mca-sm py-mca-xs font-mono text-mca-caption text-mca-ink-body"
                >
                  {o.catalog_card_id}
                  <span className="text-mca-ink-muted">
                    {" "}
                    · {o.collector_count} collectors · {o.card_count} rows
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
