"use client";

import type { CatalogCardHit } from "@/lib/dto/catalog";
import type { RankedScanCandidate } from "@/lib/scanning/phase3/types";
import {
  variantBadgeFromGroup,
  variantBadgeFromHit,
  variantBadgeInitials,
} from "@/mca-utils/scan/variant-badge";
import { RemoteCardThumb } from "@/mca-ui/remote-card-thumb";
import { cn } from "@/lib/ui/cn";

export type ScanVariantThumbProps = {
  candidate: RankedScanCandidate | CatalogCardHit;
  variantGroup?: string | null;
  size?: "sm" | "md";
  className?: string;
};

function imageUrl(c: RankedScanCandidate | CatalogCardHit): string | null {
  if ("image_url" in c && c.image_url) return c.image_url;
  return null;
}

function badgeFor(c: RankedScanCandidate | CatalogCardHit, variantGroup?: string | null): string | null {
  const fromGroup = variantBadgeFromGroup(
    variantGroup ?? ("variantGroup" in c ? c.variantGroup : null)
  );
  if (fromGroup) return fromGroup;
  if ("name" in c && "id" in c) return variantBadgeFromHit(c as CatalogCardHit);
  return null;
}

export function ScanVariantThumb({
  candidate,
  variantGroup,
  size = "md",
  className,
}: ScanVariantThumbProps) {
  const url = imageUrl(candidate);
  const badge = badgeFor(candidate, variantGroup);
  const dim = size === "sm" ? "h-8 w-[23px]" : "h-14 w-10";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-mca-control border border-mca-border bg-mca-surface",
        dim,
        className
      )}
    >
      {url ? (
        <RemoteCardThumb src={url} alt="" sizes={size === "sm" ? "32px" : "40px"} className="object-cover" />
      ) : (
        <span
          className="flex h-full items-center justify-center text-[9px] font-semibold uppercase text-mca-hint"
          aria-hidden
        >
          {badge ? variantBadgeInitials(badge) : "—"}
        </span>
      )}
      {badge && url ? (
        <span
          className="absolute bottom-0 left-0 right-0 truncate bg-mca-surface/90 px-mca-trace text-center text-[7px] font-semibold uppercase tracking-wide text-mca-ink-muted"
          aria-hidden
        >
          {badge}
        </span>
      ) : null}
    </div>
  );
}
