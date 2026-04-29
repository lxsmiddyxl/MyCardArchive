"use client";

import { UserBadge } from "@/components/badges/user-badge";
import type { JourneyProfileRow } from "@/lib/journeys/journey-catalog";
import { getCachedFlairMeta } from "@/lib/flair/flair-meta";
import { cn } from "@/lib/ui/cn";

export function JourneyProgressCard({ row }: { row: JourneyProfileRow }) {
  const pct =
    row.totalSteps > 0 ? Math.min(100, Math.round((row.completedSteps / row.totalSteps) * 100)) : 0;
  const flairMeta = row.rewardFlairKey ? getCachedFlairMeta(row.rewardFlairKey) : null;

  return (
    <div
      className={cn(
        "rounded-mca-control border border-mca-border/70 bg-mca-surface/50 p-mca-md shadow-inner",
        "motion-safe:transition motion-safe:duration-200 motion-safe:ease-mca-standard"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-mca-sm">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-mca-ink-strong">{row.displayName}</h3>
          <p className="mt-mca-xs text-mca-caption leading-snug text-mca-ink-muted">{row.description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-mca-xs">
          {row.badgeKey ? (
            <UserBadge row={{ badge_type: "journey", badge_key: row.badgeKey }} variant="compact" />
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
            className="h-full rounded-full bg-mca-accent-strong/80 motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-mca-standard"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-mca-xs text-mca-caption tabular-nums text-mca-ink-subtle">
          {row.completedSteps} / {row.totalSteps} steps
          {row.isComplete && row.completedAt ? (
            <span className="text-mca-ink-muted"> · Completed</span>
          ) : null}
        </p>
      </div>
    </div>
  );
}
