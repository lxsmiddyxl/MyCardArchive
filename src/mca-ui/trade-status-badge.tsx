"use client";

import { cn } from "@/lib/ui/cn";
import type { TradeStatus } from "@/lib/trading/types";
import { memo } from "react";

const STATUS_STYLES: Record<TradeStatus, string> = {
  draft: "border-mca-field-border bg-mca-chrome/80 text-mca-ink-body",
  sent: "border-mca-accent-border/50 bg-mca-warning-surface/40 text-mca-nav-accent",
  accepted: "border-mca-focus-soft/50 bg-mca-success-surface/35 text-mca-success-ink",
  declined: "border-mca-error-border-muted/50 bg-mca-error-surface/35 text-mca-error-text",
  countered: "border-mca-info-border/50 bg-mca-info-surface/35 text-mca-info-text",
  completed: "border-mca-border-interactive bg-mca-chrome/90 text-mca-ink-strong",
};

export type TradeStatusBadgeProps = {
  status: TradeStatus;
  className?: string;
};

export const TradeStatusBadge = memo(function TradeStatusBadge({
  status,
  className,
}: TradeStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-mca-control border px-mca-sm py-mca-xs text-mca-caption font-semibold uppercase tracking-wide transition-all duration-200 ease-mca-standard",
        STATUS_STYLES[status] ?? STATUS_STYLES.draft,
        className
      )}
    >
      {status}
    </span>
  );
});
