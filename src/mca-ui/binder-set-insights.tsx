"use client";

import {
  RARITY_BUCKET_LABELS,
  type BinderRarityDistribution,
  type RarityBucket,
} from "@/lib/catalog/binder-rarity-hints";
import type { SetCompletionProgress } from "@/lib/catalog/set-progress";
import { MCA_MOTION_PANEL } from "@/lib/ui/mca-motion";
import type { BinderAccent } from "@/lib/binders/binder-accent";
import { cn } from "@/lib/ui/cn";

export type BinderSetInsightsProps = {
  setName?: string;
  progress: SetCompletionProgress | null;
  distribution: BinderRarityDistribution | null;
  rareForBinder?: boolean;
  selectedRarity?: string | null;
  accent?: BinderAccent;
  loading?: boolean;
  className?: string;
};

export function BinderSetInsights({
  setName,
  progress,
  distribution,
  rareForBinder,
  selectedRarity,
  accent,
  loading,
  className,
}: BinderSetInsightsProps) {
  if (!loading && !progress && !distribution) return null;

  const buckets = distribution
    ? (Object.keys(distribution) as RarityBucket[]).filter((k) => distribution[k] > 0)
    : [];

  return (
    <div
      className={cn(
        "space-y-mca-sm rounded-mca-card border p-mca-compact",
        accent?.borderClass ?? "border-mca-border-subtle/80",
        accent?.surfaceClass ?? "bg-mca-surface/30",
        MCA_MOTION_PANEL,
        className
      )}
      style={accent?.color ? { borderColor: `${accent.color}55` } : undefined}
    >
      {loading ? (
        <p className="text-xs text-mca-ink-muted">Loading set insights…</p>
      ) : (
        <>
          {progress && progress.total > 0 ? (
            <div>
              <div className="flex items-center justify-between gap-mca-sm text-xs">
                <span className="font-medium text-mca-ink-body">
                  Set progress{setName ? ` · ${setName}` : ""}
                </span>
                <span className="tabular-nums text-mca-ink-muted">
                  {progress.owned} of {progress.total}
                </span>
              </div>
              <div
                className="mt-mca-xs h-1.5 overflow-hidden rounded-mca-pill bg-mca-border/50"
                role="progressbar"
                aria-valuenow={progress.owned}
                aria-valuemin={0}
                aria-valuemax={progress.total}
                aria-label={`You have ${progress.owned} of ${progress.total} cards from this set`}
              >
                <div
                  className="h-full rounded-mca-pill transition-all duration-200 ease-mca-standard"
                  style={{
                    width: `${progress.percent}%`,
                    backgroundColor: accent?.color ?? undefined,
                  }}
                />
              </div>
              <p className="mt-mca-trace text-mca-caption text-mca-ink-subtle">
                You have {progress.owned} of {progress.total} cards from this set
              </p>
            </div>
          ) : null}

          {buckets.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-mca-ink-body">Rarity in this binder (set)</p>
              <div className="mt-mca-xs flex flex-wrap gap-mca-xs">
                {buckets.map((b) => (
                  <span
                    key={b}
                    className="rounded-mca-pill border border-mca-border/70 bg-mca-chrome/40 px-mca-sm py-mca-trace text-mca-caption text-mca-ink-muted"
                  >
                    {RARITY_BUCKET_LABELS[b]} · {distribution![b]}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {rareForBinder && selectedRarity ? (
            <p className="rounded-mca-control border border-mca-accent-border/35 bg-mca-accent-border/10 px-mca-sm py-mca-tight text-xs font-medium text-mca-accent">
              Rare for this binder — {selectedRarity}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
