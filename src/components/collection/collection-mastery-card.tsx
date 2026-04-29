"use client";

import { UserBadge } from "@/components/badges/user-badge";
import type { CollectionMasteryProfileRow } from "@/lib/collection/collection-mastery-merge";
import { getCachedFlairMeta } from "@/lib/flair/flair-meta";
import { cn } from "@/lib/ui/cn";

export function CollectionMasteryCard({ row }: { row: CollectionMasteryProfileRow }) {
  const pct =
    row.threshold > 0 ? Math.min(100, Math.round((row.completedCount / row.threshold) * 100)) : 0;
  const flairMeta = row.rewardFlairKey ? getCachedFlairMeta(row.rewardFlairKey) : null;
  const kind = row.masteryType === "binder" ? "Binders" : "Master sets";

  return (
    <div
      className={cn(
        "rounded-mca-control border border-mca-border/70 bg-mca-surface/50 p-mca-md shadow-inner",
        "motion-safe:transition motion-safe:duration-200 motion-safe:ease-mca-standard"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-mca-sm">
        <div className="min-w-0 flex-1">
          <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
            {kind}
          </p>
          <h3 className="mt-mca-xs text-sm font-semibold text-mca-ink-strong">{row.displayName}</h3>
          <p className="mt-mca-xs text-mca-caption leading-snug text-mca-ink-muted">{row.description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-mca-xs">
          {row.badgeKey ? (
            <UserBadge
              row={{ badge_type: "collection_mastery", badge_key: row.badgeKey }}
              variant="compact"
            />
          ) : null}
          {row.isComplete && flairMeta ? (
            <span
              className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full border border-mca-border bg-mca-chrome/40 px-mca-xs text-mca-caption"
              title={`${flairMeta.displayName}. ${flairMeta.description}`}
            >
              <span aria-hidden>{flairMeta.iconGlyph}</span>
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-mca-md">
        <div className="h-2 overflow-hidden rounded-full bg-mca-chrome/60">
          <div
            className="h-full rounded-full bg-mca-accent-strong/75 motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-mca-standard"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-mca-xs text-mca-caption tabular-nums text-mca-ink-subtle">
          {row.completedCount} / {row.threshold} complete
          {row.isComplete && row.completedAt ? (
            <span className="text-mca-ink-muted"> · Done</span>
          ) : null}
        </p>
      </div>
    </div>
  );
}
