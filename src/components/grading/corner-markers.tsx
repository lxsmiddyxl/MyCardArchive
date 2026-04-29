"use client";

import { cn } from "@/lib/ui/cn";
import { memo } from "react";

const LABELS = ["TL", "TR", "BL", "BR"] as const;

export type CornerMarkersProps = {
  /** TL, TR, BL, BR — 0–10 when present */
  scores?: [number, number, number, number] | null;
  className?: string;
};

export const CornerMarkers = memo(function CornerMarkers({ scores, className }: CornerMarkersProps) {
  const hasAny = scores?.some((s) => s != null && Number.isFinite(s));

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 transition-opacity duration-200 ease-mca-standard",
        className
      )}
    >
      {LABELS.map((label, i) => {
        const s = scores?.[i];
        const pos =
          label === "TL"
            ? "left-1 top-1"
            : label === "TR"
              ? "right-1 top-1"
              : label === "BL"
                ? "bottom-1 left-1"
                : "bottom-1 right-1";
        return (
          <div
            key={label}
            className={cn(
              "absolute flex h-7 w-7 items-center justify-center rounded-mca-control border text-mca-caption font-mono transition-all duration-200 ease-mca-standard",
              pos,
              s != null && Number.isFinite(s)
                ? "border-mca-accent/60 bg-mca-surface/75 text-mca-nav-accent"
                : "border-mca-field-border/50 bg-mca-surface/50 text-mca-ink-subtle"
            )}
          >
            {s != null && Number.isFinite(s) ? s.toFixed(1) : label}
          </div>
        );
      })}
      {!hasAny ? (
        <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-mca-control bg-mca-surface/70 px-mca-sm py-mca-xs text-mca-caption text-mca-ink-subtle">
          Corners — awaiting model
        </p>
      ) : null}
    </div>
  );
});
