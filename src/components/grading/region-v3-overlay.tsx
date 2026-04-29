"use client";

import type { GradingRegionIssueV3 } from "@/lib/grading/types";
import { memo } from "react";

type Props = {
  regions: GradingRegionIssueV3[] | null | undefined;
  side: "front" | "back";
};

/** Normalized bbox overlays for pipeline v3 region explanations. */
export const RegionV3Overlay = memo(function RegionV3Overlay({ regions, side }: Props) {
  const list = (regions ?? []).filter((r) => r.side === side);
  if (list.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[5]">
      {list.map((r) => (
        <div
          key={r.id}
          title={`${r.label} · severity ${(r.severity * 100).toFixed(0)}%`}
          className="absolute rounded-mca-control border-2 border-mca-nav-accent/75 bg-mca-accent-strong/15 shadow-[0_0_0_1px_rgba(0,0,0,0.2)]"
          style={{
            left: `${r.bbox.x * 100}%`,
            top: `${r.bbox.y * 100}%`,
            width: `${r.bbox.w * 100}%`,
            height: `${r.bbox.h * 100}%`,
          }}
        />
      ))}
    </div>
  );
});
