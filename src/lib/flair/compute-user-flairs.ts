import { FLAIR_PRIORITY } from "@/lib/flair/flair-meta";
import {
  flairKeysFromSeasonalBadgeKeys,
  isSeasonalFlairKey,
} from "@/lib/events/seasonal-events";
import { playFlairKeysFromIdentity } from "@/lib/play/play-identity-flair";
import type { PlayIdentityBatchRow } from "@/lib/play/load-play-identity-batch";
import type { FandomIdentityFields } from "@/lib/fandom/fandom-identity-helpers";
import { fandomFlairKeysFromIdentity } from "@/lib/fandom/fandom-identity-helpers";
import type { CollectionValueCacheRow } from "@/lib/value/value-identity-helpers";
import { valueFlairKeysFromCache } from "@/lib/value/value-identity-helpers";
import type { TradeReputationCounts } from "@/lib/trade/trade-reputation-helpers";
import { tradeReputationFlairKeysFromContext } from "@/lib/trade/trade-reputation-helpers";
import { reputationFlairKeysForBadgeKeys } from "@/lib/reputation/reputation-flair-keys";
import { influenceFlairKeysForBadgeKeys } from "@/lib/influence/influence-flair-keys";

/** Reputation score from `user_reputation_cache` must reach this for Top Contributor flair. */
export const TOP_CONTRIBUTOR_MIN_SCORE = 500;

export function computeEarnedFlairKeys(args: {
  reputationScore: number;
  streakCount: number;
  tierSlug: string | null | undefined;
  csvExportCount: number;
  seasonalBadgeKeys?: string[] | null;
  /** Optional keys from completed collector journeys (server-backed). */
  journeyRewardFlairKeys?: string[] | null;
  /** Optional keys from binder / set mastery (server-backed). */
  collectionMasteryRewardFlairKeys?: string[] | null;
  /** Trade reputation aggregates (server-backed RPC). */
  tradeReputation?: TradeReputationCounts | null;
  /** Favorite format / archetype / deck label (server-backed RPC). */
  playIdentity?: Pick<
    PlayIdentityBatchRow,
    "favoriteFormatId" | "favoriteArchetypeId" | "favoriteDeckName"
  > | null;
  valueCache?: CollectionValueCacheRow | null;
  /** Favorite set / era / artist / motif / foil theme pins (`user_fandom_identity`). */
  fandomIdentity?: FandomIdentityFields | null;
  /** Opened Year-in-Review (`user_year_in_review.viewed_at`). */
  yearInReviewExplorer?: boolean;
  /** Reputation dimension badges (`user_badges` type `reputation`). */
  reputationBadgeKeys?: string[] | null;
  /** Influence badges (`user_badges` type `influence`). */
  influenceBadgeKeys?: string[] | null;
}): string[] {
  const keys: string[] = [];
  if (args.reputationScore >= TOP_CONTRIBUTOR_MIN_SCORE) {
    keys.push("top_contributor");
  }
  const t = (args.tierSlug ?? "").trim().toLowerCase();
  if (t === "business" && args.csvExportCount > 0) {
    keys.push("verified_shop");
  }
  if (args.streakCount >= 7) {
    keys.push("consistent_collector");
  } else if (args.streakCount >= 3) {
    keys.push("active_collector");
  }
  for (const fk of flairKeysFromSeasonalBadgeKeys(args.seasonalBadgeKeys ?? [])) {
    if (!keys.includes(fk)) keys.push(fk);
  }
  for (const fk of args.journeyRewardFlairKeys ?? []) {
    const t = fk?.trim();
    if (t && !keys.includes(t)) keys.push(t);
  }
  for (const fk of args.collectionMasteryRewardFlairKeys ?? []) {
    const t = fk?.trim();
    if (t && !keys.includes(t)) keys.push(t);
  }
  for (const fk of tradeReputationFlairKeysFromContext(args.tradeReputation ?? null, args.tierSlug)) {
    if (!keys.includes(fk)) keys.push(fk);
  }
  const pi = args.playIdentity;
  if (pi) {
    for (const fk of playFlairKeysFromIdentity({
      favoriteFormatId: pi.favoriteFormatId,
      favoriteArchetypeId: pi.favoriteArchetypeId,
      favoriteDeckName: pi.favoriteDeckName,
    })) {
      if (!keys.includes(fk)) keys.push(fk);
    }
  }
  for (const fk of valueFlairKeysFromCache(args.valueCache ?? null)) {
    if (!keys.includes(fk)) keys.push(fk);
  }
  for (const fk of fandomFlairKeysFromIdentity(args.fandomIdentity ?? null)) {
    if (!keys.includes(fk)) keys.push(fk);
  }
  if (args.yearInReviewExplorer) {
    keys.push("year_in_review_explorer");
  }
  for (const fk of reputationFlairKeysForBadgeKeys(args.reputationBadgeKeys ?? [])) {
    if (!keys.includes(fk)) keys.push(fk);
  }
  for (const fk of influenceFlairKeysForBadgeKeys(args.influenceBadgeKeys ?? [])) {
    if (!keys.includes(fk)) keys.push(fk);
  }
  return keys;
}

/** Top non-seasonal flair for main `InlineUserFlair` slot. */
export function pickTopFlairKey(earnedKeys: string[]): string | null {
  const nonSeasonal = earnedKeys.filter((k) => !isSeasonalFlairKey(k));
  for (const k of FLAIR_PRIORITY) {
    if (nonSeasonal.includes(k)) {
      return k;
    }
  }
  return null;
}

export function sortEarnedFlairKeys(earnedKeys: string[]): string[] {
  const ordered = FLAIR_PRIORITY.filter((k) => earnedKeys.includes(k));
  const rest = earnedKeys.filter((k) => !FLAIR_PRIORITY.includes(k));
  return [...ordered, ...rest.sort()];
}
