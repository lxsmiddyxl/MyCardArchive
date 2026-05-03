"use client";

import { fetchJson, fetchJsonErrorMessage } from "@/lib/client";
import { normalizePriceData } from "@/lib/pricing/normalize-price";
import type { CardPriceRow, PriceData } from "@/lib/types/database";
import { useCallback, useEffect, useMemo, useState } from "react";

type ApiPricingResponse = {
  summary: ReturnType<typeof normalizePriceData>;
  rows: CardPriceRow[];
};

function rowsToPriceData(rows: CardPriceRow[]): PriceData[] {
  return rows.map((r) => ({
    provider: r.provider,
    market_price: r.market_price != null ? Number(r.market_price) : null,
    currency: r.currency,
    raw: (r.raw_json as Record<string, unknown>) ?? {},
  }));
}

function providerLabel(key: string): string {
  switch (key) {
    case "tcgplayer":
      return "TCGplayer";
    case "ebay":
      return "eBay";
    case "cardmarket":
      return "Cardmarket";
    default:
      return key;
  }
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase() === "EUR" ? "EUR" : "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function CardPricePanel({
  cardId,
  initialRows,
}: {
  cardId: string;
  initialRows: CardPriceRow[];
}) {
  const [rows, setRows] = useState<CardPriceRow[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const summary = useMemo(
    () => normalizePriceData(rowsToPriceData(rows)),
    [rows]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchJson<ApiPricingResponse & { error?: string }>(
        `/api/pricing/${encodeURIComponent(cardId)}`,
        { method: "POST" }
      );
      if (r.kind !== "ok") {
        setError(fetchJsonErrorMessage(r));
        return;
      }
      const body = r.data;
      if (body.rows && Array.isArray(body.rows)) {
        setRows(body.rows);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  return (
    <section
      className="mt-mca-base space-y-mca-compact border-t border-mca-border/80 pt-mca-base"
      aria-live="polite"
      aria-busy={loading}
    >
      <div className="flex flex-wrap items-center justify-between gap-mca-sm">
        <h4 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mca-ink-subtle">
          Market prices
        </h4>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-mca-block border border-mca-field-border bg-mca-chrome/50 px-mca-compact py-mca-micro text-xs font-medium text-mca-ink-soft transition hover:border-mca-accent-border/70 hover:bg-mca-chrome hover:text-mca-warning-tint disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh prices"}
        </button>
      </div>

      {error ? (
        <p className="rounded-mca-block border border-red-900/50 bg-red-950/25 px-mca-compact py-mca-sm text-xs text-red-200/90">
          {error}
        </p>
      ) : null}

      <div className="rounded-mca-card border border-mca-border/90 bg-mca-surface/40 px-mca-compact py-mca-compact">
        {summary.best_price != null ? (
          <p className="text-sm text-mca-ink-body">
            <span className="text-mca-ink-subtle">Best (priority) </span>
            <span className="font-semibold tabular-nums text-mca-accent-highlight/95">
              {formatMoney(summary.best_price, summary.currency)}
            </span>
          </p>
        ) : (
          <p className="text-xs text-mca-ink-subtle">
            No cached prices yet. Refresh to fetch mock quotes.
          </p>
        )}

        <ul className="mt-mca-sm space-y-mca-micro text-xs text-mca-ink-muted">
          {summary.providers.map((p) => (
            <li
              key={p.provider}
              className="flex justify-between gap-mca-compact border-b border-mca-border/60 pb-mca-micro last:border-0 last:pb-0"
            >
              <span className="text-mca-ink-subtle">
                {providerLabel(p.provider)}
              </span>
              <span className="shrink-0 tabular-nums text-mca-ink-body">
                {p.market_price != null
                  ? formatMoney(p.market_price, p.currency)
                  : "—"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
