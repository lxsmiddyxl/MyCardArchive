"use client";

import { cn } from "@/lib/ui/cn";
import type { GradingExplanation } from "@/lib/grading/types";
import { memo } from "react";

export type ExplanationRegionOverlayProps = {
  regionFlags?: GradingExplanation["regionFlags"] | null;
  className?: string;
};

/**
 * Highlights regions named in v2 explanation `regionFlags` (model or heuristic).
 */
export const ExplanationRegionOverlay = memo(function ExplanationRegionOverlay({
  regionFlags,
  className,
}: ExplanationRegionOverlayProps) {
  const f = regionFlags;
  if (!f || !Object.values(f).some(Boolean)) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 transition-opacity duration-200 ease-mca-standard",
        className
      )}
      aria-hidden
    >
      {f.top_edge ? (
        <div className="absolute inset-x-[6%] top-[5%] h-1 rounded-full bg-mca-accent-strong/35 ring-1 ring-mca-accent-strong/50" />
      ) : null}
      {f.bottom_edge ? (
        <div className="absolute inset-x-[6%] bottom-[5%] h-1 rounded-full bg-mca-accent-strong/35 ring-1 ring-mca-accent-strong/50" />
      ) : null}
      {f.left_edge ? (
        <div className="absolute inset-y-[8%] left-[4%] w-1 rounded-full bg-mca-accent-strong/35 ring-1 ring-mca-accent-strong/50" />
      ) : null}
      {f.right_edge ? (
        <div className="absolute inset-y-[8%] right-[4%] w-1 rounded-full bg-mca-accent-strong/35 ring-1 ring-mca-accent-strong/50" />
      ) : null}
      {f.tl_corner ? (
        <div className="absolute left-[3%] top-[3%] h-6 w-6 rounded-mca-control border border-mca-nav-accent/70 bg-mca-accent-strong/20" />
      ) : null}
      {f.tr_corner ? (
        <div className="absolute right-[3%] top-[3%] h-6 w-6 rounded-mca-control border border-mca-nav-accent/70 bg-mca-accent-strong/20" />
      ) : null}
      {f.bl_corner ? (
        <div className="absolute bottom-[3%] left-[3%] h-6 w-6 rounded-mca-control border border-mca-nav-accent/70 bg-mca-accent-strong/20" />
      ) : null}
      {f.br_corner ? (
        <div className="absolute bottom-[3%] right-[3%] h-6 w-6 rounded-mca-control border border-mca-nav-accent/70 bg-mca-accent-strong/20" />
      ) : null}
      {f.surface_center ? (
        <div className="absolute left-1/2 top-1/2 h-[28%] w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-mca-card border border-dashed border-mca-info-surface/60 bg-mca-info-surface/10" />
      ) : null}
    </div>
  );
});
