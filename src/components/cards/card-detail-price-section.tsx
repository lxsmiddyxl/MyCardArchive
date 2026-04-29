"use client";

import { McaIcons } from "@/lib/icons/mca-icons";
import { Icon } from "@/mca-ui/icon";
import { InlineError } from "@/mca-ui/inline-error";
import { memo, useMemo } from "@/lib/perf/memo";

export type PriceHistRow = {
  id: string;
  card_id: string;
  market_price: number;
  currency: string;
  provider: string;
  recorded_at: string;
};

function sparklinePath(values: number[], w: number, h: number): string {
  if (values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const n = Math.max(values.length - 1, 1);
  return values
    .map((v, i) => {
      const x = (i / n) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

type Props = {
  priceHistory: PriceHistRow[];
  priceHistoryLoading: boolean;
  priceHistoryError: string | null;
};

export const CardDetailPriceSection = memo(function CardDetailPriceSection({
  priceHistory,
  priceHistoryLoading,
  priceHistoryError,
}: Props) {
  const priceStats = useMemo(() => {
    const series = [...priceHistory].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );
    const prices = series.map((r) => Number(r.market_price));
    if (prices.length === 0) {
      return {
        change7: null as number | null,
        change30: null as number | null,
        high: null as number | null,
        low: null as number | null,
        spark: [] as number[],
      };
    }
    const last = prices[prices.length - 1]!;
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const now = Date.now();
    const ms7 = now - 7 * 86_400_000;
    const ms30 = now - 30 * 86_400_000;
    let p7 = prices[0]!;
    let p30 = prices[0]!;
    for (const r of series) {
      const t = new Date(r.recorded_at).getTime();
      const v = Number(r.market_price);
      if (t <= ms7) p7 = v;
      if (t <= ms30) p30 = v;
    }
    return {
      change7: last - p7,
      change30: last - p30,
      high,
      low,
      spark: prices,
    };
  }, [priceHistory]);

  return (
    <div className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/50 p-mca-base dark:border-mca-border-subtle">
      <p className="text-sm font-medium uppercase tracking-wide text-mca-ink-subtle">Price history</p>
      {priceHistoryLoading ? (
        <p className="mt-mca-sm text-xs text-mca-ink-subtle">Loading history…</p>
      ) : priceHistoryError ? (
        <InlineError className="mt-mca-sm text-xs" showIcon>
          {priceHistoryError}
        </InlineError>
      ) : (
        <>
          <div className="mt-mca-sm grid grid-cols-2 gap-mca-sm text-xs text-mca-ink-body sm:grid-cols-4">
            <div className="rounded-mca-block border border-mca-border bg-mca-surface/40 px-mca-sm py-mca-micro">
              <p className="text-mca-ink-subtle">7d</p>
              <p
                className={
                  (priceStats.change7 ?? 0) >= 0 ? "text-mca-success" : "text-mca-error-accent"
                }
              >
                {priceStats.change7 == null
                  ? "—"
                  : `${priceStats.change7 >= 0 ? "+" : ""}$${priceStats.change7.toFixed(2)}`}
              </p>
            </div>
            <div className="rounded-mca-block border border-mca-border bg-mca-surface/40 px-mca-sm py-mca-micro">
              <p className="text-mca-ink-subtle">30d</p>
              <p
                className={
                  (priceStats.change30 ?? 0) >= 0 ? "text-mca-success" : "text-mca-error-accent"
                }
              >
                {priceStats.change30 == null
                  ? "—"
                  : `${priceStats.change30 >= 0 ? "+" : ""}$${priceStats.change30.toFixed(2)}`}
              </p>
            </div>
            <div className="rounded-mca-block border border-mca-border bg-mca-surface/40 px-mca-sm py-mca-micro">
              <p className="text-mca-ink-subtle">High</p>
              <p className="text-mca-ink-strong">
                {priceStats.high == null ? "—" : `$${priceStats.high.toFixed(2)}`}
              </p>
            </div>
            <div className="rounded-mca-block border border-mca-border bg-mca-surface/40 px-mca-sm py-mca-micro">
              <p className="text-mca-ink-subtle">Low</p>
              <p className="text-mca-ink-strong">
                {priceStats.low == null ? "—" : `$${priceStats.low.toFixed(2)}`}
              </p>
            </div>
          </div>
          <div className="mt-mca-compact rounded-mca-block border border-mca-border bg-mca-surface/40 p-mca-sm">
            {priceStats.spark.length > 1 ? (
              <svg
                viewBox="0 0 240 64"
                className="h-16 w-full text-mca-accent"
                preserveAspectRatio="none"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d={sparklinePath(priceStats.spark, 240, 64)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            ) : (
              <p className="py-mca-base text-center text-xs text-mca-ink-subtle">
                Not enough history for a chart yet.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
});

export type CatalogLegalityFlags = {
  legal_standard?: boolean;
  legal_expanded?: boolean;
  legal_unlimited?: boolean;
  legal_commander?: boolean;
} | null;

type LegalityProps = { catalog: CatalogLegalityFlags };

export const CardDetailLegalitySection = memo(function CardDetailLegalitySection({
  catalog,
}: LegalityProps) {
  const legalFlags = useMemo(
    () => [
      { label: "Standard", value: catalog?.legal_standard },
      { label: "Expanded", value: catalog?.legal_expanded },
      { label: "Unlimited", value: catalog?.legal_unlimited },
      { label: "Brawl", value: catalog?.legal_commander },
    ],
    [catalog]
  );

  return (
    <div className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/50 p-mca-base dark:border-mca-border-subtle">
      <p className="text-sm font-medium uppercase tracking-wide text-mca-ink-subtle">Legality</p>
      <div className="mt-mca-base grid grid-cols-2 gap-mca-compact">
        {legalFlags.map((flag) => (
          <div
            key={flag.label}
            className={`flex items-center gap-mca-sm rounded-mca-control border px-mca-compact py-mca-sm text-xs ${
              flag.value
                ? "border-mca-success-surface-border/60 bg-mca-success-surface/20 text-mca-success-soft"
                : "border-mca-error-border/60 bg-mca-error-surface/20 text-mca-error-text-muted"
            }`}
          >
            {flag.value ? (
              <Icon src={McaIcons.ui.check} size="sm" alt="" />
            ) : (
              <Icon src={McaIcons.ui.warning} size="sm" alt="" />
            )}
            <span>
              {flag.label}: {flag.value ? "Legal" : "Not legal"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});
