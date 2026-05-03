"use client";

import { cn } from "@/lib/ui/cn";
import { memo, useMemo } from "react";

export type ProfileActivityHeatmapProps = {
  year: number;
  counts: number[];
  className?: string;
};

function utcDayLabel(year: number, dayIndex: number): string {
  const d = new Date(Date.UTC(year, 0, 1 + dayIndex));
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export const ProfileActivityHeatmap = memo(function ProfileActivityHeatmap({
  year,
  counts,
  className,
}: ProfileActivityHeatmapProps) {
  const max = useMemo(() => Math.max(1, ...counts), [counts]);
  const total = useMemo(() => counts.reduce((a, b) => a + b, 0), [counts]);

  return (
    <div className={cn("space-y-mca-sm", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-mca-sm">
        <p className="text-mca-caption text-mca-ink-muted">
          <span className="tabular-nums font-semibold text-mca-ink-body">{total}</span> activities in {year}{" "}
          (UTC)
        </p>
      </div>
      <div
        className="grid w-full max-w-full gap-mca-trace motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-mca-standard"
        style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
      >
        {counts.map((c, i) => {
          const intensity = c <= 0 ? 0 : 0.12 + (c / max) * 0.88;
          const title = `${c} activit${c === 1 ? "y" : "ies"} on ${utcDayLabel(year, i)}`;
          return (
            <div
              key={i}
              title={title}
              className={cn(
                "aspect-square min-h-[10px] rounded-[2px] border border-mca-border/25",
                c <= 0 ? "bg-mca-chrome/25" : "bg-mca-accent-strong"
              )}
              style={c > 0 ? { opacity: intensity } : undefined}
            />
          );
        })}
      </div>
      <p className="text-mca-caption text-mca-ink-subtle">Less ··· More</p>
    </div>
  );
});
