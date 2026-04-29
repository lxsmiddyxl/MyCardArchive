"use client";

import { cn } from "@/lib/ui/cn";
import { memo, useMemo } from "react";

export type MiniActivityStripProps = {
  counts: number[];
  className?: string;
};

/** Horizontal intensity strip for mutuals / recommendations (typically last 30 UTC days). */
export const MiniActivityStrip = memo(function MiniActivityStrip({
  counts,
  className,
}: MiniActivityStripProps) {
  const max = useMemo(() => Math.max(1, ...counts), [counts]);
  if (counts.length === 0) return null;

  return (
    <div
      className={cn(
        "flex max-w-[180px] gap-px motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-mca-standard",
        className
      )}
      aria-hidden
      title="Recent activity intensity (UTC)"
    >
      {counts.map((c, i) => {
        const intensity = c <= 0 ? 0.12 : 0.15 + (c / max) * 0.85;
        return (
          <div
            key={i}
            className="h-3 min-w-[3px] flex-1 rounded-[1px] bg-mca-accent-strong"
            style={{ opacity: intensity }}
          />
        );
      })}
    </div>
  );
});
