"use client";

import { TIER_FEATURE_GATE_TOOLTIP } from "@/lib/tier/tier-gate-copy";
import { cn } from "@/lib/ui/cn";
import { TooltipSurface } from "@/mca-ui/tooltip-surface";

export type TierFeatureGateKind = "pro" | "elite" | "business";

export function TierFeatureGateBadge({
  kind = "pro",
  className,
}: {
  kind?: TierFeatureGateKind;
  className?: string;
}) {
  const label =
    kind === "elite" ? "Elite" : kind === "business" ? "Business" : "Pro";
  const tip = TIER_FEATURE_GATE_TOOLTIP[kind];

  return (
    <span className={cn("group relative inline-flex shrink-0", className)}>
      <span
        className={cn(
          "inline-flex cursor-default rounded-full border border-mca-accent-strong/35 bg-mca-accent-strong/12 px-mca-xs py-mca-trace text-[0.65rem] font-semibold uppercase tracking-wide text-mca-accent/95",
          kind === "elite" &&
            "border-mca-violet-border/50 bg-mca-violet-surface/25 text-mca-violet-text",
          kind === "business" &&
            "border-mca-border-interactive bg-mca-chrome/70 text-mca-ink-strong dark:border-mca-border-subtle dark:bg-mca-surface-elevated/80"
        )}
        tabIndex={0}
        aria-label={`${label} feature: ${tip}`}
      >
        {label}
      </span>
      <span
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-mca-xs w-max max-w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
        role="tooltip"
      >
        <TooltipSurface className="pointer-events-none text-xs leading-snug text-mca-ink-body">
          {tip}
        </TooltipSurface>
      </span>
    </span>
  );
}
