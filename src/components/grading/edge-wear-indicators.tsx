"use client";

import { cn } from "@/lib/ui/cn";
import type { EdgeWearMap } from "@/lib/grading/types";
import { memo } from "react";

export type EdgeWearIndicatorsProps = {
  edges?: EdgeWearMap | null;
  className?: string;
};

export const EdgeWearIndicators = memo(function EdgeWearIndicators({
  edges,
  className,
}: EdgeWearIndicatorsProps) {
  const hasData = edges && Object.values(edges).some((v) => v > 0);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-mca-sm bottom-mca-sm rounded-mca-control border border-mca-border-subtle/60 bg-mca-surface/55 px-mca-sm py-mca-xs transition-all duration-200 ease-mca-standard",
        className
      )}
    >
      <div className="relative h-10 w-full">
        <div
          className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-gradient-to-r from-transparent via-mca-accent-strong/50 to-transparent transition-opacity duration-200 ease-mca-standard"
          style={{ opacity: edges?.top ?? 0.15 }}
        />
        <div
          className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-mca-accent-strong/30 via-transparent to-mca-accent-strong/30 transition-opacity duration-200 ease-mca-standard"
          style={{ opacity: edges?.bottom ?? 0.15 }}
        />
        <div
          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gradient-to-b from-transparent via-mca-accent-strong/45 to-transparent transition-opacity duration-200 ease-mca-standard"
          style={{ opacity: edges?.left ?? 0.15 }}
        />
        <div
          className="absolute inset-y-2 right-0 w-0.5 rounded-full bg-gradient-to-b from-mca-accent-strong/30 via-transparent to-mca-accent-strong/30 transition-opacity duration-200 ease-mca-standard"
          style={{ opacity: edges?.right ?? 0.15 }}
        />
        <p className="absolute inset-0 flex items-center justify-center text-mca-caption text-mca-ink-subtle">
          {hasData ? "Edge wear (preview)" : "Edges — awaiting model"}
        </p>
      </div>
    </div>
  );
});
