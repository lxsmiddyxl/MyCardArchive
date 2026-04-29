"use client";

import { cn } from "@/lib/ui/cn";
import { memo } from "react";

export type CenteringOverlayProps = {
  /** 0–100, higher = better; when null, show idle state */
  score?: number | null;
  confidence?: number | null;
  className?: string;
};

export const CenteringOverlay = memo(function CenteringOverlay({
  score,
  confidence,
  className,
}: CenteringOverlayProps) {
  const hasData = score != null && Number.isFinite(score);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 transition-opacity duration-200 ease-mca-standard",
        className
      )}
      aria-hidden={!hasData}
    >
      <div
        className={cn(
          "absolute inset-[10%] rounded-mca-control border-2 transition-all duration-200 ease-mca-standard",
          hasData ? "border-mca-success/50" : "border-mca-focus/20"
        )}
      />
      <div
        className={cn(
          "absolute inset-[16%] rounded-sm border border-dashed transition-all duration-200 ease-mca-standard",
          hasData ? "border-mca-accent/45" : "border-mca-field-border/30"
        )}
      />
      {hasData ? (
        <div className="absolute bottom-mca-sm left-0 right-0 text-center text-mca-caption font-medium text-mca-success-soft/95">
          Centering {Math.round(score)}
          {confidence != null ? ` · ${Math.round(confidence * 100)}% conf.` : ""}
        </div>
      ) : (
        <div className="absolute bottom-mca-sm left-0 right-0 text-center text-mca-caption text-mca-ink-subtle">
          Centering — awaiting model
        </div>
      )}
    </div>
  );
});
