"use client";

import {
  RARITY_BUCKET_LABELS,
  type BinderRarityDistribution,
  type RarityBucket,
} from "@/lib/catalog/binder-rarity-hints";
import {
  VARIANT_BUCKET_LABELS,
  type VariantBucket,
  type VariantDistribution,
} from "@/lib/catalog/variant-distribution";
import type { BinderAccent } from "@/lib/binders/binder-accent";
import { MCA_MOTION_PANEL } from "@/lib/ui/mca-motion";
import { cn } from "@/lib/ui/cn";
import { ChartContainer } from "@/mca-ui/chart-container";
import { MetricBlock, MetricGrid } from "@/mca-ui/metric-block";
import { Panel } from "@/mca-ui/panel";

export type BinderDistributionPanelProps = {
  rarity_distribution: BinderRarityDistribution;
  variant_distribution: VariantDistribution;
  duplicate_count: number;
  total_variants: number;
  accent?: BinderAccent;
  loading?: boolean;
  className?: string;
};

function DistributionBars({
  distribution,
  labels,
  accentColor,
}: {
  distribution: Record<string, number>;
  labels: Record<string, string>;
  accentColor?: string;
}) {
  const entries = Object.entries(distribution).filter(([, n]) => n > 0);
  const max = Math.max(1, ...entries.map(([, n]) => n));
  if (entries.length === 0) {
    return <p className="text-xs text-mca-ink-subtle">No data yet.</p>;
  }
  return (
    <ul className="space-y-mca-sm" role="list">
      {entries.map(([key, count]) => (
        <li key={key}>
          <div className="flex items-center justify-between gap-mca-sm text-xs">
            <span className="text-mca-ink-body">{labels[key] ?? key}</span>
            <span className="tabular-nums text-mca-ink-muted">{count}</span>
          </div>
          <div
            className="mt-mca-trace h-2 overflow-hidden rounded-mca-pill bg-mca-border/50"
            aria-hidden
          >
            <div
              className="h-full rounded-mca-pill transition-all duration-200 ease-mca-standard"
              style={{
                width: `${Math.round((count / max) * 100)}%`,
                backgroundColor: accentColor ?? "var(--mca-accent-strong, #6366f1)",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function BinderDistributionPanel({
  rarity_distribution,
  variant_distribution,
  duplicate_count,
  total_variants,
  accent,
  loading,
  className,
}: BinderDistributionPanelProps) {
  if (loading) {
    return (
      <Panel className={cn("text-sm text-mca-ink-muted", className)}>
        Loading distribution…
      </Panel>
    );
  }

  return (
    <section
      className={cn("space-y-mca-md", className)}
      aria-labelledby="binder-distribution-heading"
    >
      <h2
        id="binder-distribution-heading"
        className="text-xs font-medium uppercase tracking-[0.2em] text-mca-ink-subtle"
      >
        Collection breakdown
      </h2>

      <MetricGrid className="sm:grid-cols-2">
        <MetricBlock label="Duplicates">
          <p className="mt-mca-xs text-2xl font-semibold tabular-nums text-mca-ink-strong">
            {duplicate_count}
          </p>
        </MetricBlock>
        <MetricBlock label="Variants tracked">
          <p className="mt-mca-xs text-2xl font-semibold tabular-nums text-mca-ink-strong">
            {total_variants}
          </p>
        </MetricBlock>
      </MetricGrid>

      <div className="grid gap-mca-md lg:grid-cols-2">
        <ChartContainer
          className={cn(
            "border",
            accent?.borderClass,
            MCA_MOTION_PANEL
          )}
          style={accent?.color ? { borderColor: `${accent.color}33` } : undefined}
        >
          <h3 className="text-sm font-medium text-mca-ink-body">Rarity</h3>
          <DistributionBars
            distribution={rarity_distribution}
            labels={RARITY_BUCKET_LABELS as Record<RarityBucket, string>}
            accentColor={accent?.color}
          />
        </ChartContainer>
        <ChartContainer
          className={cn(
            "border",
            accent?.borderClass,
            MCA_MOTION_PANEL
          )}
          style={accent?.color ? { borderColor: `${accent.color}33` } : undefined}
        >
          <h3 className="text-sm font-medium text-mca-ink-body">Variants</h3>
          <DistributionBars
            distribution={variant_distribution}
            labels={VARIANT_BUCKET_LABELS as Record<VariantBucket, string>}
            accentColor={accent?.color}
          />
        </ChartContainer>
      </div>
    </section>
  );
}
