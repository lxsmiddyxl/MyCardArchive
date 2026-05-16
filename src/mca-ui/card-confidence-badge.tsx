"use client";

import type { CatalogMatchConfidenceBand } from "@/mca-utils/catalog/confidence";
import { catalogMatchConfidenceLabel } from "@/mca-utils/catalog/confidence";
import { cn } from "@/lib/ui/cn";

const BAND_STYLES: Record<CatalogMatchConfidenceBand, string> = {
  high: "border-mca-success-surface-border/50 bg-mca-success-surface/30 text-mca-success-tint",
  medium:
    "border-mca-warning-surface-border/50 bg-mca-warning-surface/25 text-mca-warning-tint",
  low: "border-mca-danger-surface-border/40 bg-mca-danger-surface/20 text-mca-danger-tint",
};

export function CardConfidenceBadge({
  band,
  className,
}: {
  band: CatalogMatchConfidenceBand;
  className?: string;
}) {
  const label = catalogMatchConfidenceLabel(band);
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center rounded-mca-pill border px-mca-sm py-mca-trace text-[10px] font-semibold uppercase tracking-wide",
        BAND_STYLES[band],
        className
      )}
      title={label}
    >
      <span aria-hidden>{label}</span>
      <span className="sr-only">Catalog match confidence: {label}</span>
    </span>
  );
}
