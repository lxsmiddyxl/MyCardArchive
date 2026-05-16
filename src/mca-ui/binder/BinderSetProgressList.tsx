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
import { Panel } from "@/mca-ui/panel";
import type { BinderSetInsight } from "@/mca-utils/binders/binder-insights-types";
import Image from "next/image";
import Link from "next/link";

export type BinderSetProgressListProps = {
  binderId: string;
  sets: BinderSetInsight[];
  accent?: BinderAccent;
  loading?: boolean;
  className?: string;
};

function DistributionPills({
  distribution,
  labels,
}: {
  distribution: BinderRarityDistribution | VariantDistribution;
  labels: Record<string, string>;
}) {
  const keys = Object.keys(distribution).filter(
    (k) => (distribution as Record<string, number>)[k] > 0
  );
  if (keys.length === 0) return null;
  return (
    <div className="mt-mca-xs flex flex-wrap gap-mca-xs">
      {keys.map((k) => (
        <span
          key={k}
          className="rounded-mca-pill border border-mca-border/70 bg-mca-chrome/40 px-mca-sm py-mca-trace text-mca-caption text-mca-ink-muted"
        >
          {labels[k] ?? k} · {(distribution as Record<string, number>)[k]}
        </span>
      ))}
    </div>
  );
}

export function BinderSetProgressList({
  binderId,
  sets,
  accent,
  loading,
  className,
}: BinderSetProgressListProps) {
  if (loading) {
    return (
      <Panel className={cn("text-sm text-mca-ink-muted", className)}>
        Loading set progress…
      </Panel>
    );
  }

  if (sets.length === 0) {
    return (
      <Panel className={cn("text-sm text-mca-ink-muted", className)}>
        Add catalog-linked cards to track set completion.
      </Panel>
    );
  }

  return (
    <section className={cn("space-y-mca-md", className)} aria-labelledby="binder-sets-heading">
      <h2
        id="binder-sets-heading"
        className="text-xs font-medium uppercase tracking-[0.2em] text-mca-ink-subtle"
      >
        Set progress
      </h2>
      <ul className="space-y-mca-md">
        {sets.map((set) => {
          const { progress } = set;
          const missingHref = `/binders/${encodeURIComponent(binderId)}/missing?setId=${encodeURIComponent(set.set_id)}`;
          return (
            <li key={set.set_id}>
              <Panel
                className={cn(
                  "space-y-mca-sm border",
                  accent?.borderClass ?? "border-mca-border-subtle/80",
                  accent?.surfaceClass ?? "bg-mca-surface/30",
                  MCA_MOTION_PANEL
                )}
                style={accent?.color ? { borderColor: `${accent.color}44` } : undefined}
              >
                <div className="flex items-start gap-mca-sm">
                  {set.symbol_url || set.logo_url ? (
                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-mca-control bg-mca-chrome/50">
                      <Image
                        src={(set.symbol_url ?? set.logo_url)!}
                        alt=""
                        width={32}
                        height={32}
                        className="object-contain p-mca-trace"
                        unoptimized
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-mca-sm">
                      <h3 className="font-medium text-mca-ink-body">{set.set_name}</h3>
                      <span className="text-xs tabular-nums text-mca-ink-muted">
                        {progress.owned} of {progress.total}
                      </span>
                    </div>
                    {progress.total > 0 ? (
                      <div
                        className="mt-mca-xs h-1.5 overflow-hidden rounded-mca-pill bg-mca-border/50"
                        role="progressbar"
                        aria-valuenow={progress.owned}
                        aria-valuemin={0}
                        aria-valuemax={progress.total}
                        aria-label={`${set.set_name}: ${progress.owned} of ${progress.total} cards`}
                      >
                        <div
                          className="h-full rounded-mca-pill transition-all duration-200 ease-mca-standard"
                          style={{
                            width: `${progress.percent}%`,
                            backgroundColor: accent?.color,
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                <DistributionPills
                  distribution={set.rarity_distribution}
                  labels={RARITY_BUCKET_LABELS as Record<RarityBucket, string>}
                />
                <DistributionPills
                  distribution={set.variant_distribution}
                  labels={VARIANT_BUCKET_LABELS as Record<VariantBucket, string>}
                />

                {set.missing_count > 0 ? (
                  <Link
                    href={missingHref}
                    className="inline-flex text-xs font-medium text-mca-accent-strong/90 transition hover:text-mca-accent"
                  >
                    View missing cards ({set.missing_count})
                  </Link>
                ) : (
                  <p className="text-xs text-mca-ink-subtle">Set complete</p>
                )}
              </Panel>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
