"use client";

import { cn } from "@/lib/ui/cn";
import { memo } from "react";

export type SurfaceHeatmapProps = {
  /** Optional coarse grid 0–1 for preview */
  intensityMap?: number[][] | null;
  /** When using `summary.explanation.heatmapHints`, label reflects model hint overlay. */
  variant?: "surface" | "explanation_hint";
  className?: string;
};

export const SurfaceHeatmap = memo(function SurfaceHeatmap({
  intensityMap,
  variant = "surface",
  className,
}: SurfaceHeatmapProps) {
  const hasGrid = Array.isArray(intensityMap) && intensityMap.length > 0;
  const caption =
    variant === "explanation_hint"
      ? hasGrid
        ? "Surface hint overlay"
        : "Surface hint — awaiting model"
      : hasGrid
        ? "Surface heatmap (preview)"
        : "Surface — awaiting model";

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 transition-opacity duration-200 ease-mca-standard",
        className
      )}
    >
      <div
        className={cn(
          "absolute inset-[8%] rounded-mca-control opacity-90 mix-blend-screen transition-opacity duration-200 ease-mca-standard",
          hasGrid
            ? "[background-image:radial-gradient(circle_at_30%_40%,rgba(244,63,94,0.35),transparent_45%),radial-gradient(circle_at_70%_55%,rgba(56,189,248,0.28),transparent_50%)]"
            : "bg-gradient-to-br from-mca-error-surface/15 via-transparent to-mca-info-surface/25"
        )}
      />
      <p className="absolute bottom-[18%] left-0 right-0 text-center text-mca-caption text-mca-ink-subtle">
        {caption}
      </p>
    </div>
  );
});
