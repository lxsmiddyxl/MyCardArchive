"use client";

import { UserBadge } from "@/components/badges/user-badge";
import type { UserBadgeRow } from "@/lib/badges/types";
import { InlineUserFlair } from "@/components/flair/inline-user-flair";
import { cn } from "@/lib/ui/cn";

/**
 * One compact seasonal affordance for social rows: prefer flair, else seasonal badge.
 * Keys must come from server API enrichment (no client-side awarding).
 */
export function InlineSeasonalEvent({
  topSeasonalFlairKey,
  topSeasonalBadgeKey,
  className,
}: {
  topSeasonalFlairKey?: string | null;
  topSeasonalBadgeKey?: string | null;
  className?: string;
}) {
  const fk = topSeasonalFlairKey?.trim() ?? "";
  if (fk) {
    return <InlineUserFlair flairKey={fk} className={className} />;
  }
  const bk = topSeasonalBadgeKey?.trim() ?? "";
  if (!bk) return null;
  const row: UserBadgeRow = { badge_type: "seasonal_event", badge_key: bk };
  return (
    <span className={cn("inline-flex shrink-0", className)}>
      <UserBadge row={row} variant="compact" />
    </span>
  );
}
