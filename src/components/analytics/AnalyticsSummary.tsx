"use client";

import { AnimatedNumber } from "@/mca-ui/animated-number";
import { MetricBlock, MetricGrid } from "@/mca-ui/metric-block";
import type { AnalyticsSummary as Summary } from "@/lib/analytics/types";

export type AnalyticsSummaryProps = {
  summary: Summary;
};

function formatUsd(n: number): string {
  try {
    if (!Number.isFinite(n)) return "—";
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} USD`;
  }
}

export function AnalyticsSummary({ summary }: AnalyticsSummaryProps) {
  const s = summary ?? {
    card_count: 0,
    unique_cards: 0,
    total_value: 0,
  };

  const totalValue =
    typeof s.total_value === "number" && Number.isFinite(s.total_value) ? s.total_value : 0;

  return (
    <MetricGrid>
      <MetricBlock label="Total cards">
        <p className="mt-mca-sm text-2xl font-semibold tabular-nums tracking-tight text-mca-ink-strong">
          <AnimatedNumber value={s.card_count} />
        </p>
      </MetricBlock>
      <MetricBlock label="Unique cards" revealClassName="mca-section-reveal-delay-1">
        <p className="mt-mca-sm text-2xl font-semibold tabular-nums tracking-tight text-mca-ink-strong">
          <AnimatedNumber value={s.unique_cards} />
        </p>
      </MetricBlock>
      <MetricBlock label="Est. value (USD)" revealClassName="mca-section-reveal-delay-2">
        <p className="mt-mca-sm text-2xl font-semibold tabular-nums tracking-tight text-mca-accent-highlight/95 transition-opacity duration-200 ease-out">
          {formatUsd(totalValue)}
        </p>
      </MetricBlock>
    </MetricGrid>
  );
}
