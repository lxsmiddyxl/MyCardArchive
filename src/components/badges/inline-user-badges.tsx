"use client";

import { UserBadge } from "@/components/badges/user-badge";
import type { UserBadgeRow } from "@/lib/badges/types";
import { TierBadgeInline } from "@/components/tier/tier-badge-inline";
import { cn } from "@/lib/ui/cn";

function pickProgressionBadgeRow(args: {
  milestoneKey?: string | null;
  journeyBadgeKey?: string | null;
  collectionMasteryBadgeKey?: string | null;
}): UserBadgeRow | null {
  if (args.collectionMasteryBadgeKey?.trim()) {
    return { badge_type: "collection_mastery", badge_key: args.collectionMasteryBadgeKey.trim() };
  }
  if (args.journeyBadgeKey?.trim()) {
    return { badge_type: "journey", badge_key: args.journeyBadgeKey.trim() };
  }
  if (args.milestoneKey?.trim()) {
    return { badge_type: "scan_milestone", badge_key: args.milestoneKey.trim() };
  }
  return null;
}

/**
 * Tier + progression chip + optional third chip: trade → play → collection value → fandom.
 */
export function InlineUserBadges({
  tierSlug,
  milestoneKey,
  journeyBadgeKey,
  collectionMasteryBadgeKey,
  tradeBadgeKey,
  tradeReputationSummary,
  playBadgeKey,
  valueBadgeKey,
  valueIdentitySummary,
  fandomBadgeKey,
  fandomSummary,
  className,
}: {
  tierSlug?: string | null;
  milestoneKey?: string | null;
  journeyBadgeKey?: string | null;
  collectionMasteryBadgeKey?: string | null;
  tradeBadgeKey?: string | null;
  /** Shown as native `title` on the trade chip when a trade badge is present. */
  tradeReputationSummary?: string | null;
  playBadgeKey?: string | null;
  valueBadgeKey?: string | null;
  /** Shown on the value chip when `valueBadgeKey` is set (estimates, not advice). */
  valueIdentitySummary?: string | null;
  fandomBadgeKey?: string | null;
  /** Shown when a fandom chip wins the third progression slot after trade/play/value vacant. */
  fandomSummary?: string | null;
  className?: string;
}) {
  const progressionRow = pickProgressionBadgeRow({
    milestoneKey,
    journeyBadgeKey,
    collectionMasteryBadgeKey,
  });
  const tradeRow: UserBadgeRow | null =
    tradeBadgeKey && tradeBadgeKey.length > 0
      ? { badge_type: "trade_reputation", badge_key: tradeBadgeKey }
      : null;
  const playRow: UserBadgeRow | null =
    !tradeRow && playBadgeKey && playBadgeKey.length > 0
      ? { badge_type: "play_identity", badge_key: playBadgeKey }
      : null;
  const valueRow: UserBadgeRow | null =
    !tradeRow && !playRow && valueBadgeKey && valueBadgeKey.length > 0
      ? { badge_type: "collection_value", badge_key: valueBadgeKey }
      : null;
  const fandomRow: UserBadgeRow | null =
    !tradeRow && !playRow && !valueRow && fandomBadgeKey && fandomBadgeKey.length > 0
      ? { badge_type: "fandom", badge_key: fandomBadgeKey }
      : null;

  if (!tierSlug?.trim() && !progressionRow && !tradeRow && !playRow && !valueRow && !fandomRow) {
    return null;
  }

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-mca-xs", className)}>
      {tierSlug?.trim() ? <TierBadgeInline tierSlug={tierSlug} /> : null}
      {progressionRow ? <UserBadge row={progressionRow} variant="compact" /> : null}
      {tradeRow ? (
        <span
          title={
            tradeBadgeKey?.trim() && tradeReputationSummary?.trim()
              ? tradeReputationSummary.trim()
              : undefined
          }
        >
          <UserBadge row={tradeRow} variant="compact" />
        </span>
      ) : playRow ? (
        <UserBadge row={playRow} variant="compact" />
      ) : valueRow ? (
        <span
          title={
            valueBadgeKey?.trim() && valueIdentitySummary?.trim()
              ? `${valueIdentitySummary.trim()} — Illustrative estimate only; not financial advice.`
              : undefined
          }
        >
          <UserBadge row={valueRow} variant="compact" />
        </span>
      ) : fandomRow ? (
        <span
          title={
            fandomBadgeKey?.trim() && fandomSummary?.trim() ? `${fandomSummary.trim()}` : undefined
          }
        >
          <UserBadge row={fandomRow} variant="compact" />
        </span>
      ) : null}
    </span>
  );
}
