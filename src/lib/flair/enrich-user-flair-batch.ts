import type { Database } from "@/lib/supabase/types";
import { loadSeasonalEventContextByUserIds } from "@/lib/events/load-seasonal-event-context";
import { pickTopSeasonalFlairKeyFromBadgeKeys } from "@/lib/events/seasonal-events";
import { computeEarnedFlairKeys, pickTopFlairKey } from "@/lib/flair/compute-user-flairs";
import { loadSocialFlairContextByUserIds } from "@/lib/flair/load-social-flair-context";
import {
  buildCollectionMasteryInlineSummary,
  collectionMasteryRewardFlairKeysFromRows,
  pickTopCollectionMasteryBadgeKey,
} from "@/lib/collection/collection-mastery-merge";
import { loadSocialCollectionMasteryByUserIds } from "@/lib/collection/load-collection-mastery-batch";
import {
  buildJourneyProgressSummary,
  journeyRewardFlairKeysFromRows,
  pickTopJourneyBadgeKey,
} from "@/lib/journeys/journey-catalog";
import { loadSocialJourneyProgressByUserIds } from "@/lib/journeys/load-journey-batch";
import {
  loadSocialPlayIdentityByUserIds,
  type PlayIdentityBatchRow,
} from "@/lib/play/load-play-identity-batch";
import { pickSecondaryFlairKey } from "@/lib/flair/pick-secondary-flair";
import { pickTopPlayBadgeKey } from "@/lib/play/play-identity-badges";
import {
  buildTradeReputationScoreSummary,
  pickTopTradeBadgeKey,
  type TradeReputationCounts,
} from "@/lib/trade/trade-reputation-helpers";
import { loadSocialTradeReputationByUserIds } from "@/lib/trade/load-trade-reputation-batch";
import { buildGrailHighlightSummary } from "@/lib/value/grail-helpers";
import {
  loadSocialCollectionValueByUserIds,
  loadSocialGrailHighlightByUserIds,
} from "@/lib/value/load-value-identity-batch";
import {
  buildValueIdentitySummary,
  pickTopValueBadgeKey,
  rarityProfileFromCounts,
  type CollectionValueCacheRow,
} from "@/lib/value/value-identity-helpers";
import type { FandomIdentityFields } from "@/lib/fandom/fandom-identity-helpers";
import {
  buildFandomSummary,
  pickTopFandomBadgeKey,
} from "@/lib/fandom/fandom-identity-helpers";
import { loadSocialFandomIdentityByUserIds } from "@/lib/fandom/load-fandom-identity-batch";
import { loadSocialPersonaByUserIds } from "@/lib/persona/load-persona-batch";
import {
  loadSocialSimilarityByUserIds,
  type SimilarUserEntry,
} from "@/lib/social-graph/load-similarity-batch";
import type { ActivityState, PresenceState } from "@/lib/presence/presence-types";
import { loadSocialPresenceByUserIds } from "@/lib/presence/load-presence-batch";
import { getLastCompletedSeasonForDate } from "@/lib/seasons/season-catalog";
import {
  loadSeasonHighlightByUserIds,
  loadYirViewedYearByUserIds,
} from "@/lib/seasons/load-season-social-batch";
import {
  clubsSummaryLine,
  mapClubIdsToChips,
  pickPrimaryClubId,
  type ClubChip,
} from "@/lib/clubs/club-catalog";
import { loadSocialClubsByUserIds } from "@/lib/clubs/load-social-clubs-batch";
import {
  buildReputationSummaryLine,
  pickTopReputationDimension,
  type ReputationScores,
} from "@/lib/reputation/reputation-summary";
import type { ReputationDimensionId } from "@/lib/reputation/reputation-catalog";
import {
  buildInfluenceSummaryLine,
  pickTopInfluenceDimension,
  type InfluenceScores,
} from "@/lib/influence/influence-summary";
import type { InfluenceDimensionId } from "@/lib/influence/influence-catalog";
import type { SupabaseClient } from "@supabase/supabase-js";

export type UserFlairEnrichment = {
  reputationScore: number;
  activityStreak: number;
  earnedFlairKeys: string[];
  topFlairKey: string | null;
  topSeasonalBadgeKey: string | null;
  seasonalBadgeKeys: string[];
  topSeasonalFlairKey: string | null;
  topJourneyBadgeKey: string | null;
  journeyProgressSummary: string | null;
  topCollectionMasteryBadgeKey: string | null;
  collectionMasterySummary: string | null;
  tradeReputation: TradeReputationCounts | null;
  tradeReputationScoreSummary: string | null;
  topTradeBadgeKey: string | null;
  favoriteFormatId: string | null;
  favoriteArchetypeId: string | null;
  favoriteDeckName: string | null;
  topPlayBadgeKey: string | null;
  secondaryPlayFlairKey: string | null;
  valueIdentitySummary: string | null;
  rarityProfileLabel: string | null;
  topValueBadgeKey: string | null;
  grailHighlightSummary: string | null;
  favoriteSetId: string | null;
  favoriteEraId: string | null;
  favoriteArtistId: string | null;
  favoriteCharacterId: string | null;
  favoriteThemeId: string | null;
  topFandomBadgeKey: string | null;
  fandomSummary: string | null;
  personaText: string | null;
  similarUsers: SimilarUserEntry[];
  topSimilarUserId: string | null;
  presenceState: PresenceState;
  activityState: ActivityState;
  lastSeenAt: string | null;
  lastActivityAt: string | null;
  /** Coarse activity key from DB — for client re-derivation with `deriveActivityState`. */
  lastActivityKey: string | null;
  presenceOptOut: boolean;
  /** One-line season recap strip (last completed season, if generated). */
  seasonHighlight: string | null;
  /** Auto-assigned collector cohorts (public metadata only). */
  clubs: ClubChip[];
  primaryClubId: string | null;
  /** Preformatted clubs line for tooltips (no raw scoring). */
  clubsSummary: string | null;
  /** Internal 0–100 graph vertices (for radar geometry / server logic — avoid printing as numbers in social UI). */
  reputationScores: ReputationScores | null;
  /** Highest strong dimension, if any. */
  topReputationDimension: ReputationDimensionId | null;
  /** Qualitative line for tooltips and strips. */
  reputationSummary: string | null;
  /** Up to two dimension ids for compact chips (search, cards). */
  reputationDimensionChips: ReputationDimensionId[];
  influenceScores: InfluenceScores | null;
  topInfluenceDimension: InfluenceDimensionId | null;
  influenceSummary: string | null;
  influenceDimensionChips: InfluenceDimensionId[];
};

function defaultPlayRow(userId: string): PlayIdentityBatchRow {
  return {
    userId,
    favoriteFormatId: null,
    favoriteArchetypeId: null,
    favoriteDeckName: null,
    deckCountForBadges: 0,
    updatedAt: null,
  };
}

export async function enrichUsersWithFlair(
  supabase: SupabaseClient<Database>,
  userIds: string[],
  tierByUserId: Record<string, string | null | undefined>
): Promise<Record<string, UserFlairEnrichment>> {
  const unique = [...new Set(userIds.map((x) => x.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return {};
  }
  const lastSeason = getLastCompletedSeasonForDate(new Date());
  const [
    ctx,
    seasonalCtx,
    journeyByUser,
    collectionByUser,
    tradeByUser,
    playByUser,
    valueByUser,
    grailByUser,
    fandomByUser,
    personaByUser,
    similarityByUser,
    presenceByUser,
    seasonHighlights,
    yirViewedBy,
    clubsByUser,
    repGraphRes,
    repBadgeRes,
    inflGraphRes,
    inflBadgeRes,
  ] =
    await Promise.all([
      loadSocialFlairContextByUserIds(supabase, unique),
      loadSeasonalEventContextByUserIds(supabase, unique),
      loadSocialJourneyProgressByUserIds(supabase, unique),
      loadSocialCollectionMasteryByUserIds(supabase, unique),
      loadSocialTradeReputationByUserIds(supabase, unique),
      loadSocialPlayIdentityByUserIds(supabase, unique),
      loadSocialCollectionValueByUserIds(supabase, unique),
      loadSocialGrailHighlightByUserIds(supabase, unique),
      loadSocialFandomIdentityByUserIds(supabase, unique),
      loadSocialPersonaByUserIds(supabase, unique),
      loadSocialSimilarityByUserIds(supabase, unique),
      loadSocialPresenceByUserIds(supabase, unique),
      loadSeasonHighlightByUserIds(supabase, unique, lastSeason.year, lastSeason.seasonId),
      loadYirViewedYearByUserIds(supabase, unique),
      loadSocialClubsByUserIds(supabase, unique),
      supabase.rpc("get_users_reputation_graph_batch", { p_user_ids: unique }),
      supabase
        .from("user_badges")
        .select("user_id, badge_key")
        .in("user_id", unique)
        .eq("badge_type", "reputation"),
      supabase.rpc("get_users_influence_batch", { p_user_ids: unique }),
      supabase
        .from("user_badges")
        .select("user_id, badge_key")
        .in("user_id", unique)
        .eq("badge_type", "influence"),
    ]);
  const repByUser = new Map<string, ReputationScores>();
  const repRows = Array.isArray(repGraphRes.data) ? repGraphRes.data : [];
  for (const raw of repRows as Record<string, unknown>[]) {
    const uid = String(raw.user_id ?? "");
    if (!uid) continue;
    repByUser.set(uid, {
      helpfulness: Number(raw.helpfulness_score ?? 0),
      expertise: Number(raw.expertise_score ?? 0),
      positivity: Number(raw.positivity_score ?? 0),
      reliability: Number(raw.reliability_score ?? 0),
      contribution: Number(raw.contribution_score ?? 0),
    });
  }
  const repBadgesByUser = new Map<string, string[]>();
  for (const b of repBadgeRes.data ?? []) {
    const uid = b.user_id;
    const bk = b.badge_key;
    if (!uid || !bk) continue;
    const cur = repBadgesByUser.get(uid) ?? [];
    cur.push(String(bk));
    repBadgesByUser.set(uid, cur);
  }
  const inflByUser = new Map<string, InfluenceScores>();
  for (const raw of Array.isArray(inflGraphRes.data) ? inflGraphRes.data : []) {
    const r = raw as Record<string, unknown>;
    const uid = String(r.user_id ?? "");
    if (!uid) continue;
    inflByUser.set(uid, {
      identity_reach: Number(r.identity_reach_score ?? 0),
      contribution_reach: Number(r.contribution_reach_score ?? 0),
      expertise_reach: Number(r.expertise_reach_score ?? 0),
      social_reach: Number(r.social_reach_score ?? 0),
      seasonal_reach: Number(r.seasonal_reach_score ?? 0),
    });
  }
  const inflBadgesByUser = new Map<string, string[]>();
  for (const b of inflBadgeRes.data ?? []) {
    const uid = b.user_id;
    const bk = b.badge_key;
    if (!uid || !bk) continue;
    const cur = inflBadgesByUser.get(uid) ?? [];
    cur.push(String(bk));
    inflBadgesByUser.set(uid, cur);
  }
  const out: Record<string, UserFlairEnrichment> = {};
  for (const id of unique) {
    const row = ctx[id];
    const reputationScore = row?.reputation_score ?? 0;
    const activityStreak = row?.streak_count ?? 0;
    const csvExportCount = row?.csv_export_count ?? 0;
    const tierSlug = tierByUserId[id];
    const srow = seasonalCtx[id];
    const seasonalBadgeKeys = srow?.seasonal_badge_keys ?? [];
    const topSeasonalBadgeKey = srow?.top_seasonal_badge_key ?? null;
    const topSeasonalFlairKey = pickTopSeasonalFlairKeyFromBadgeKeys(seasonalBadgeKeys);
    const journeyRows = journeyByUser[id] ?? [];
    const journeyFlair = journeyRewardFlairKeysFromRows(journeyRows);
    const collectionRows = collectionByUser[id] ?? [];
    const collectionFlair = collectionMasteryRewardFlairKeysFromRows(collectionRows);
    const tradeRep = tradeByUser[id] ?? null;
    const playRow = playByUser[id] ?? defaultPlayRow(id);
    const valueCache: CollectionValueCacheRow | null = valueByUser[id] ?? null;
    const fandomIdentity: FandomIdentityFields | null = fandomByUser[id] ?? null;
    const repScores = repByUser.get(id) ?? null;
    const inflScores = inflByUser.get(id) ?? null;
    const earnedFlairKeys = computeEarnedFlairKeys({
      reputationScore,
      streakCount: activityStreak,
      tierSlug,
      csvExportCount,
      seasonalBadgeKeys,
      journeyRewardFlairKeys: journeyFlair,
      collectionMasteryRewardFlairKeys: collectionFlair,
      tradeReputation: tradeRep,
      playIdentity: {
        favoriteFormatId: playRow.favoriteFormatId,
        favoriteArchetypeId: playRow.favoriteArchetypeId,
        favoriteDeckName: playRow.favoriteDeckName,
      },
      valueCache,
      fandomIdentity,
      yearInReviewExplorer: yirViewedBy[id] != null,
      reputationBadgeKeys: repBadgesByUser.get(id) ?? [],
      influenceBadgeKeys: inflBadgesByUser.get(id) ?? [],
    });
    const repChipThreshold = 45;
    const repChips: ReputationDimensionId[] = repScores
      ? (["helpfulness", "expertise", "positivity", "reliability", "contribution"] as const)
          .filter((d) => (repScores[d] ?? 0) >= repChipThreshold)
          .sort((a, b) => (repScores[b] ?? 0) - (repScores[a] ?? 0))
          .slice(0, 2)
      : [];
    const inflChipThreshold = 45;
    const inflChips: InfluenceDimensionId[] = inflScores
      ? ([
          "identity_reach",
          "contribution_reach",
          "expertise_reach",
          "social_reach",
          "seasonal_reach",
        ] as const)
          .filter((d) => (inflScores[d] ?? 0) >= inflChipThreshold)
          .sort((a, b) => (inflScores[b] ?? 0) - (inflScores[a] ?? 0))
          .slice(0, 2)
      : [];
    const topTrade = pickTopTradeBadgeKey(tradeRep, tierSlug);
    const topFlair = pickTopFlairKey(earnedFlairKeys);
    const topPlay = pickTopPlayBadgeKey(
      {
        favoriteFormatId: playRow.favoriteFormatId,
        favoriteArchetypeId: playRow.favoriteArchetypeId,
      },
      playRow.deckCountForBadges
    );
    const gh = grailByUser[id];
    const grailSummary = gh
      ? buildGrailHighlightSummary(gh.grailCount, gh.highlightName)
      : null;
    const topFan = pickTopFandomBadgeKey(fandomIdentity);
    const personaText = personaByUser[id] ?? null;
    const simParsed = similarityByUser[id] ?? { similarUsers: [], topSimilarUserId: null };
    const pr = presenceByUser[id];
    const clubIds = clubsByUser[id] ?? [];
    const clubs = mapClubIdsToChips(clubIds);
    const primaryClubId = pickPrimaryClubId(clubIds);
    out[id] = {
      reputationScore,
      activityStreak,
      earnedFlairKeys,
      topFlairKey: topFlair,
      topSeasonalBadgeKey,
      seasonalBadgeKeys,
      topSeasonalFlairKey,
      topJourneyBadgeKey: pickTopJourneyBadgeKey(journeyRows),
      journeyProgressSummary: buildJourneyProgressSummary(journeyRows),
      topCollectionMasteryBadgeKey: pickTopCollectionMasteryBadgeKey(collectionRows),
      collectionMasterySummary: buildCollectionMasteryInlineSummary(collectionRows),
      tradeReputation: tradeRep,
      tradeReputationScoreSummary: buildTradeReputationScoreSummary(tradeRep),
      topTradeBadgeKey: topTrade,
      favoriteFormatId: playRow.favoriteFormatId,
      favoriteArchetypeId: playRow.favoriteArchetypeId,
      favoriteDeckName: playRow.favoriteDeckName,
      topPlayBadgeKey: topPlay,
      secondaryPlayFlairKey: pickSecondaryFlairKey(earnedFlairKeys, topFlair),
      valueIdentitySummary: buildValueIdentitySummary(valueCache),
      rarityProfileLabel: rarityProfileFromCounts(valueCache),
      topValueBadgeKey: pickTopValueBadgeKey(valueCache),
      grailHighlightSummary: grailSummary,
      favoriteSetId: fandomIdentity?.favoriteSetId ?? null,
      favoriteEraId: fandomIdentity?.favoriteEraId ?? null,
      favoriteArtistId: fandomIdentity?.favoriteArtistId ?? null,
      favoriteCharacterId: fandomIdentity?.favoriteCharacterId ?? null,
      favoriteThemeId: fandomIdentity?.favoriteThemeId ?? null,
      topFandomBadgeKey: topFan,
      fandomSummary: buildFandomSummary(fandomIdentity),
      personaText,
      similarUsers: simParsed.similarUsers,
      topSimilarUserId: simParsed.topSimilarUserId,
      presenceState: pr?.presenceState ?? "offline",
      activityState: pr?.activityState ?? "idle",
      lastSeenAt: pr?.presenceOptOut ? null : pr?.lastSeenAt ?? null,
      lastActivityAt: pr?.presenceOptOut ? null : pr?.lastActivityAt ?? null,
      lastActivityKey: pr?.presenceOptOut ? null : pr?.lastActivityRaw ?? null,
      presenceOptOut: pr?.presenceOptOut ?? false,
      seasonHighlight: seasonHighlights[id] ?? null,
      clubs,
      primaryClubId,
      clubsSummary: clubsSummaryLine(clubs),
      reputationScores: repScores,
      topReputationDimension: pickTopReputationDimension(repScores),
      reputationSummary: buildReputationSummaryLine(repScores),
      reputationDimensionChips: repChips,
      influenceScores: inflScores,
      topInfluenceDimension: pickTopInfluenceDimension(inflScores),
      influenceSummary: buildInfluenceSummaryLine(inflScores),
      influenceDimensionChips: inflChips,
    };
  }
  return out;
}
