import type { UserBadgeRow } from "@/lib/badges/types";
import { loadSeasonalEventContextByUserIds } from "@/lib/events/load-seasonal-event-context";
import { computeEarnedFlairKeys, sortEarnedFlairKeys } from "@/lib/flair/compute-user-flairs";
import { loadSocialFlairContextByUserIds } from "@/lib/flair/load-social-flair-context";
import {
  buildFullBinderMasteryRows,
  buildFullSetCompletionRows,
  collectionMasteryRewardFlairKeysFromRows,
  type CollectionMasteryDbRow,
} from "@/lib/collection/collection-mastery-merge";
import {
  buildFullJourneyProfileRows,
  journeyRewardFlairKeysFromRows,
  splitActiveAndCompleted,
  type JourneyProgressDbRow,
} from "@/lib/journeys/journey-catalog";
import { getCollectionStatsForUser } from "@/lib/social/collection-stats";
import type {
  ActivityHeatmapPayload,
  CollectionStats,
  FandomSuggestionsPayload,
  GrailCardPayload,
  SocialBadgeProgressPayload,
  SocialPresenceSnapshot,
  SocialProfilePayload,
  SocialInfluenceBlock,
  SocialReputationBlock,
  TimelineEventPayload,
} from "@/lib/social/types";
import { partitionBadgeV2Rows, type BadgeV2RpcRow } from "@/lib/badges/badge-catalog";
import { getLastCompletedSeasonForDate } from "@/lib/seasons/season-catalog";
import type { SeasonSummaryJsonV1, YearInReviewJsonV1 } from "@/lib/seasons/summary-types";
import { mapClubIdsToChips, pickPrimaryClubId } from "@/lib/clubs/club-catalog";
import type { ClubChip } from "@/lib/clubs/club-catalog";
import type { Database } from "@/lib/supabase/types";
import {
  loadUserPlayIdentityRpc,
  loadUserTopDeckStatsRpc,
} from "@/lib/play/load-play-identity-batch";
import { loadUserTradeReputationRpc } from "@/lib/trade/load-trade-reputation-batch";
import type { TradeReputationCounts } from "@/lib/trade/trade-reputation-helpers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import type { CollectionValueCacheRow } from "@/lib/value/value-identity-helpers";
import type { FandomIdentityFields } from "@/lib/fandom/fandom-identity-helpers";
import { loadSocialPresenceByUserIds } from "@/lib/presence/load-presence-batch";
import { buildReputationSummaryLine, pickTopReputationDimension } from "@/lib/reputation/reputation-summary";
import type { ReputationScores } from "@/lib/reputation/reputation-summary";
import { buildInfluenceSummaryLine, pickTopInfluenceDimension } from "@/lib/influence/influence-summary";
import type { InfluenceScores } from "@/lib/influence/influence-summary";
import { buildPresenceQualitativeLabel } from "@/lib/presence/presence-labels";
import { buildPersonaV2FromArchetypes, type ArchetypeFitRow } from "@/lib/persona/persona-v2";
import { parseIdentityMapJson, type IdentityMapPublic } from "@/lib/identity/collector-identity-map";
import { loadCollectorIdentityMapByUserIds } from "@/lib/identity/load-identity-map-batch";
import { loadCollectorArchetypesByUserIds } from "@/lib/persona/load-collector-archetypes-batch";

const STATS_STALE_MS = 5 * 60 * 1000;

async function loadIdentityMapProfileRpc(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<IdentityMapPublic> {
  try {
    const { data, error } = await supabase.rpc("get_user_identity_map", { p_user_id: userId });
    if (error || !Array.isArray(data) || data.length === 0) {
      return parseIdentityMapJson(null);
    }
    const row = data[0] as { identity?: unknown };
    return parseIdentityMapJson(row.identity);
  } catch {
    return parseIdentityMapJson(null);
  }
}

async function loadPersonaV2ProfileRpc(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{
  personaV2Label: string | null;
  personaV2Summary: string | null;
  topArchetypes: ArchetypeFitRow[];
}> {
  try {
    const { data, error } = await supabase.rpc("get_user_archetypes", { p_user_id: userId });
    if (error || !Array.isArray(data)) {
      return { personaV2Label: null, personaV2Summary: null, topArchetypes: [] };
    }
    const rows: ArchetypeFitRow[] = (data as Record<string, unknown>[]).map((raw) => ({
      archetype_id: String(raw.archetype_id ?? ""),
      label: String(raw.label ?? ""),
      description: raw.description != null ? String(raw.description) : null,
      icon_key: raw.icon_key != null ? String(raw.icon_key) : null,
      confidence_band: String(raw.confidence_band ?? ""),
    }));
    return buildPersonaV2FromArchetypes(rows);
  } catch {
    return { personaV2Label: null, personaV2Summary: null, topArchetypes: [] };
  }
}

function profilePresenceFromLoad(
  row: import("@/lib/presence/load-presence-batch").UserPresenceRow | undefined
): SocialPresenceSnapshot | null {
  if (!row) return null;
  if (row.presenceOptOut) {
    return {
      optedOut: true,
      lastSeenAt: null,
      lastActivityAt: null,
      lastActivityKey: null,
    };
  }
  return {
    optedOut: false,
    lastSeenAt: row.lastSeenAt,
    lastActivityAt: row.lastActivityAt,
    lastActivityKey: row.lastActivityRaw,
  };
}

const EMPTY_TRADE_REPUTATION: TradeReputationCounts = {
  completedTradesCount: 0,
  positiveFeedbackCount: 0,
  neutralFeedbackCount: 0,
  negativeFeedbackCount: 0,
  lastTradeAt: null,
};

function playIdentityPayloadFromRow(row: {
  favoriteFormatId: string | null;
  favoriteArchetypeId: string | null;
  favoriteDeckName: string | null;
  updatedAt: string | null;
}): NonNullable<SocialProfilePayload["playIdentity"]> {
  return {
    favoriteFormatId: row.favoriteFormatId,
    favoriteArchetypeId: row.favoriteArchetypeId,
    favoriteDeckName: row.favoriteDeckName,
    updatedAt: row.updatedAt,
  };
}

function parseFavoriteSets(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

export function stubPublicProfile(userId: string, reason?: string): SocialProfilePayload {
  const tail = userId.replace(/-/g, "").slice(0, 4);
  return {
    userId,
    username: `collector_${tail}`,
    displayName: null,
    handle: null,
    location: null,
    website: null,
    avatarUrl: null,
    favoriteCard: null,
    favoriteSet: null,
    favoriteColor: null,
    joinedAt: null,
    activityCounts: {
      communityPosts: 0,
      scans: 0,
      achievements: 0,
      trades: 0,
    },
    tierSlug: null,
    badges: [],
    reputationScore: 0,
    activityStreak: 0,
    earnedFlairKeys: [],
    stats: {
      cardCount: 0,
      binderCount: 0,
      deckCount: 0,
      tradeCount: 0,
    },
    visibility: "stub",
    notFound: true,
    stubReason:
      reason ??
      "This trainer profile could not be found. They may have left MyCardArchive or the link is invalid.",
    journeys: [],
    activeJourneys: [],
    completedJourneys: [],
    collectionMastery: [],
    tradeReputation: { ...EMPTY_TRADE_REPUTATION },
    playIdentity: {
      favoriteFormatId: null,
      favoriteArchetypeId: null,
      favoriteDeckName: null,
      updatedAt: null,
    },
    playTopDecks: [],
    collectionValue: null,
    grailCards: [],
    fandomIdentity: null,
    fandomSuggestions: null,
    personaText: null,
    personaV2Label: null,
    personaV2Summary: null,
    topArchetypes: [],
    identityHeadline: null,
    identitySummary: null,
    identityTraits: [],
    identityClusters: [],
    identitySignals: [],
    identityArchetypeBlend: [],
    presence: null,
    presenceLabel: null,
    activityHeatmap: null,
    timelineEvents: [],
    lastSeasonSummary: null,
    lastYearInReview: null,
    clubs: [],
    primaryClubId: null,
    reputation: null,
    influence: null,
    badgesV2: null,
  };
}

function emptyFandomIdentity(): FandomIdentityFields {
  return {
    favoriteSetId: null,
    favoriteEraId: null,
    favoriteArtistId: null,
    favoriteCharacterId: null,
    favoriteThemeId: null,
  };
}

async function loadUserFandomIdentityRpc(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<FandomIdentityFields | null> {
  try {
    const { data, error } = await supabase.rpc("get_user_fandom_identity", { p_user_id: userId });
    if (error || !Array.isArray(data) || data.length === 0) return null;
    const raw = data[0] as Record<string, unknown>;
    return {
      favoriteSetId:
        raw.favorite_set_id != null && String(raw.favorite_set_id).trim().length > 0
          ? String(raw.favorite_set_id).trim()
          : null,
      favoriteEraId:
        raw.favorite_era_id != null && String(raw.favorite_era_id).trim().length > 0
          ? String(raw.favorite_era_id).trim()
          : null,
      favoriteArtistId:
        raw.favorite_artist_id != null && String(raw.favorite_artist_id).trim().length > 0
          ? String(raw.favorite_artist_id).trim()
          : null,
      favoriteCharacterId:
        raw.favorite_character_id != null && String(raw.favorite_character_id).trim().length > 0
          ? String(raw.favorite_character_id).trim()
          : null,
      favoriteThemeId:
        raw.favorite_theme_id != null && String(raw.favorite_theme_id).trim().length > 0
          ? String(raw.favorite_theme_id).trim()
          : null,
    };
  } catch {
    return null;
  }
}

async function loadUserFandomSuggestionsRpc(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<FandomSuggestionsPayload | null> {
  try {
    const { data, error } = await supabase.rpc("suggest_user_fandom_identity", { p_user_id: userId });
    if (error || !Array.isArray(data) || data.length === 0) return null;
    const raw = data[0] as Record<string, unknown>;
    return {
      suggestedSetId:
        raw.suggested_set_id != null && String(raw.suggested_set_id).trim().length > 0
          ? String(raw.suggested_set_id).trim()
          : null,
      suggestedEraId:
        raw.suggested_era_id != null && String(raw.suggested_era_id).trim().length > 0
          ? String(raw.suggested_era_id).trim()
          : null,
      suggestedArtistId:
        raw.suggested_artist_id != null && String(raw.suggested_artist_id).trim().length > 0
          ? String(raw.suggested_artist_id).trim()
          : null,
      suggestedCharacterId:
        raw.suggested_character_id != null && String(raw.suggested_character_id).trim().length > 0
          ? String(raw.suggested_character_id).trim()
          : null,
      suggestedThemeId:
        raw.suggested_theme_id != null && String(raw.suggested_theme_id).trim().length > 0
          ? String(raw.suggested_theme_id).trim()
          : null,
    };
  } catch {
    return null;
  }
}

async function loadUserPersonaRpc(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("get_user_persona", { p_user_id: userId });
    if (error || !Array.isArray(data) || data.length === 0) return null;
    const raw = data[0] as { persona_text?: string | null };
    const t = raw.persona_text;
    return t != null && String(t).trim().length > 0 ? String(t).trim() : null;
  } catch {
    return null;
  }
}

async function loadUserCollectionValueRpc(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<CollectionValueCacheRow | null> {
  try {
    const { data, error } = await supabase.rpc("get_user_collection_value", { p_user_id: userId });
    if (error || !Array.isArray(data) || data.length === 0) return null;
    const r = data[0] as Record<string, unknown>;
    return {
      estimatedValueCents: Number(r.estimated_value_cents ?? 0),
      totalCards: Number(r.total_cards ?? 0),
      uniqueCards: Number(r.unique_cards ?? 0),
      highRarityCount: Number(r.high_rarity_count ?? 0),
      lastRefreshedAt: r.last_refreshed_at != null ? String(r.last_refreshed_at) : null,
    };
  } catch {
    return null;
  }
}

async function loadUserGrailCardsRpc(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<GrailCardPayload[]> {
  try {
    const { data, error } = await supabase.rpc("get_user_grail_cards", { p_user_id: userId });
    if (error || !Array.isArray(data)) return [];
    return (data as Record<string, unknown>[]).map((r) => ({
      cardId: String(r.card_id ?? ""),
      cardName: String(r.card_name ?? "Card"),
      note: r.note != null ? String(r.note) : null,
      addedAt: r.added_at != null ? String(r.added_at) : "",
    }));
  } catch {
    return [];
  }
}

async function ensureStatsFresh(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const { data } = await supabase
    .from("social_collection_stats_public")
    .select("updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  const stale =
    !data?.updated_at ||
    Date.now() - new Date(data.updated_at).getTime() > STATS_STALE_MS;

  if (stale) {
    await supabase.rpc("refresh_social_collection_stats_for_user", { p_user_id: userId });
  }
}

async function loadStats(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<CollectionStats> {
  const { data } = await supabase
    .from("social_collection_stats_public")
    .select("card_count, binder_count, deck_count, trade_count")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    return getCollectionStatsForUser(supabase, userId);
  }

  return {
    cardCount: data.card_count,
    binderCount: data.binder_count,
    deckCount: data.deck_count,
    tradeCount: data.trade_count,
  };
}

async function loadUserJourneyProgressRpc(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<JourneyProgressDbRow[]> {
  try {
    const { data, error } = await supabase.rpc("get_user_journey_progress", { p_user_id: userId });
    if (error || !Array.isArray(data)) return [];
    return (
      data as {
        journey_id: string;
        completed_steps: number;
        is_complete: boolean;
        completed_at: string | null;
      }[]
    ).map((r) => ({
      journey_id: String(r.journey_id),
      completed_steps: Number(r.completed_steps),
      is_complete: Boolean(r.is_complete),
      completed_at: r.completed_at != null ? String(r.completed_at) : null,
    }));
  } catch {
    return [];
  }
}

async function loadUserCollectionMasteryRpc(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<CollectionMasteryDbRow[]> {
  try {
    const { data, error } = await supabase.rpc("get_user_collection_mastery", { p_user_id: userId });
    if (error || !Array.isArray(data)) return [];
    return (
      data as {
        mastery_type: string;
        mastery_key: string;
        completed_count: number;
        is_complete: boolean;
        completed_at: string | null;
      }[]
    ).map((r) => ({
      mastery_type: r.mastery_type === "set" ? "set" : "binder",
      mastery_key: String(r.mastery_key),
      completed_count: Number(r.completed_count),
      is_complete: Boolean(r.is_complete),
      completed_at: r.completed_at != null ? String(r.completed_at) : null,
    }));
  } catch {
    return [];
  }
}

async function loadReputationBlock(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<SocialReputationBlock | null> {
  try {
    const { data: rows, error } = await supabase.rpc("get_user_reputation", { p_user_id: userId });
    if (error || !Array.isArray(rows) || rows.length === 0) return null;
    const r = rows[0] as Record<string, unknown>;
    const radar: ReputationScores = {
      helpfulness: Number(r.helpfulness_score ?? 0),
      expertise: Number(r.expertise_score ?? 0),
      positivity: Number(r.positivity_score ?? 0),
      reliability: Number(r.reliability_score ?? 0),
      contribution: Number(r.contribution_score ?? 0),
    };
    const { data: evRows } = await supabase.rpc("get_user_reputation_events_public", {
      p_user_id: userId,
      p_limit: 12,
    });
    const recentEvents = (Array.isArray(evRows) ? evRows : []).map((x) => {
      const e = x as { label?: string; occurred_on?: string; occurredOn?: string };
      const day = e.occurred_on ?? e.occurredOn;
      return {
        label: String(e.label ?? ""),
        occurredOn: day != null ? String(day).slice(0, 10) : "",
      };
    });
    return {
      summary: buildReputationSummaryLine(radar),
      topDimension: pickTopReputationDimension(radar),
      radar,
      recentEvents,
    };
  } catch {
    return null;
  }
}

async function loadInfluenceBlock(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<SocialInfluenceBlock | null> {
  try {
    const { data: rows, error } = await supabase.rpc("get_user_influence", { p_user_id: userId });
    if (error || !Array.isArray(rows) || rows.length === 0) return null;
    const r = rows[0] as Record<string, unknown>;
    const radar: InfluenceScores = {
      identity_reach: Number(r.identity_reach_score ?? 0),
      contribution_reach: Number(r.contribution_reach_score ?? 0),
      expertise_reach: Number(r.expertise_reach_score ?? 0),
      social_reach: Number(r.social_reach_score ?? 0),
      seasonal_reach: Number(r.seasonal_reach_score ?? 0),
    };
    const { data: evRows } = await supabase.rpc("get_user_influence_events_public", {
      p_user_id: userId,
      p_limit: 12,
    });
    const recentEvents = (Array.isArray(evRows) ? evRows : []).map((x) => {
      const e = x as { label?: string; occurred_on?: string; occurredOn?: string };
      const day = e.occurred_on ?? e.occurredOn;
      return {
        label: String(e.label ?? ""),
        occurredOn: day != null ? String(day).slice(0, 10) : "",
      };
    });
    return {
      summary: buildInfluenceSummaryLine(radar),
      topDimension: pickTopInfluenceDimension(radar),
      radar,
      recentEvents,
    };
  } catch {
    return null;
  }
}

async function loadBadgeV2Progress(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<SocialBadgeProgressPayload | null> {
  try {
    const { data, error } = await supabase.rpc("get_user_badge_progress", { p_user_id: userId });
    if (error || data == null) return null;
    const rows = (Array.isArray(data) ? data : []) as BadgeV2RpcRow[];
    const p = partitionBadgeV2Rows(rows);
    return {
      rows: p.badgeProgress,
      topBadges: p.topBadges,
      seasonalBadges: p.seasonalBadges,
      prestigeBadges: p.prestigeBadges,
      badgeHighlight: p.badgeHighlight,
    };
  } catch {
    return null;
  }
}

async function loadFlairExtras(
  supabase: SupabaseClient<Database>,
  userId: string,
  tierSlug: string | null
): Promise<{
  reputationScore: number;
  activityStreak: number;
  earnedFlairKeys: string[];
  journeyRows: JourneyProgressDbRow[];
  collectionMasteryRows: CollectionMasteryDbRow[];
  tradeReputation: TradeReputationCounts | null;
  playIdentity: NonNullable<SocialProfilePayload["playIdentity"]>;
  collectionValue: CollectionValueCacheRow | null;
  fandomIdentity: FandomIdentityFields | null;
}> {
  try {
    const [
      ctx,
      seasonal,
      journeyRows,
      collectionMasteryRows,
      tradeReputation,
      playRow,
      valueCache,
      fandomIdentity,
      repBadgeRes,
      inflBadgeRes,
    ] =
      await Promise.all([
        loadSocialFlairContextByUserIds(supabase, [userId]),
        loadSeasonalEventContextByUserIds(supabase, [userId]),
        loadUserJourneyProgressRpc(supabase, userId),
        loadUserCollectionMasteryRpc(supabase, userId),
        loadUserTradeReputationRpc(supabase, userId),
        loadUserPlayIdentityRpc(supabase, userId),
        loadUserCollectionValueRpc(supabase, userId),
        loadUserFandomIdentityRpc(supabase, userId),
        supabase
          .from("user_badges")
          .select("badge_key")
          .eq("user_id", userId)
          .eq("badge_type", "reputation"),
        supabase
          .from("user_badges")
          .select("badge_key")
          .eq("user_id", userId)
          .eq("badge_type", "influence"),
      ]);
    const row = ctx[userId];
    const reputationScore = row?.reputation_score ?? 0;
    const activityStreak = row?.streak_count ?? 0;
    const csvExportCount = row?.csv_export_count ?? 0;
    const seasonalBadgeKeys = seasonal[userId]?.seasonal_badge_keys ?? [];
    const journeyFlair = journeyRewardFlairKeysFromRows(journeyRows);
    const collectionFlair = collectionMasteryRewardFlairKeysFromRows(collectionMasteryRows);
    const playIdentity = playRow ?? {
      userId,
      favoriteFormatId: null,
      favoriteArchetypeId: null,
      favoriteDeckName: null,
      deckCountForBadges: 0,
      updatedAt: null,
    };
    const reputationBadgeKeys = (repBadgeRes.data ?? [])
      .map((x) => x.badge_key)
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    const influenceBadgeKeys = (inflBadgeRes.data ?? [])
      .map((x) => x.badge_key)
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    const earnedFlairKeys = sortEarnedFlairKeys(
      computeEarnedFlairKeys({
        reputationScore,
        streakCount: activityStreak,
        tierSlug,
        csvExportCount,
        seasonalBadgeKeys,
        journeyRewardFlairKeys: journeyFlair,
        collectionMasteryRewardFlairKeys: collectionFlair,
        tradeReputation,
        playIdentity: {
          favoriteFormatId: playIdentity.favoriteFormatId,
          favoriteArchetypeId: playIdentity.favoriteArchetypeId,
          favoriteDeckName: playIdentity.favoriteDeckName,
        },
        valueCache,
        fandomIdentity,
        reputationBadgeKeys,
        influenceBadgeKeys,
      })
    );
    return {
      reputationScore,
      activityStreak,
      earnedFlairKeys,
      journeyRows,
      collectionMasteryRows,
      tradeReputation,
      playIdentity: playIdentityPayloadFromRow(playIdentity),
      collectionValue: valueCache,
      fandomIdentity,
    };
  } catch {
    return {
      reputationScore: 0,
      activityStreak: 0,
      earnedFlairKeys: [],
      journeyRows: [],
      collectionMasteryRows: [],
      tradeReputation: null,
      playIdentity: {
        favoriteFormatId: null,
        favoriteArchetypeId: null,
        favoriteDeckName: null,
        updatedAt: null,
      },
      collectionValue: null,
      fandomIdentity: null,
    };
  }
}

async function loadUserBadges(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserBadgeRow[]> {
  try {
    const { data, error } = await supabase.rpc("get_user_badges", { p_user_id: userId });
    if (error || !Array.isArray(data)) return [];
    return (data as UserBadgeRow[]).map((r) => ({
      id: r.id != null ? String(r.id) : undefined,
      user_id: r.user_id != null ? String(r.user_id) : undefined,
      badge_type: String(r.badge_type),
      badge_key: String(r.badge_key),
      earned_at: r.earned_at != null ? String(r.earned_at) : undefined,
    }));
  } catch {
    return [];
  }
}

async function loadActivityCounts(
  supabase: SupabaseClient<Database>,
  userId: string,
  tradeCount: number
): Promise<NonNullable<SocialProfilePayload["activityCounts"]>> {
  const fallback = {
    communityPosts: 0,
    scans: 0,
    achievements: 0,
    trades: tradeCount,
  };
  try {
    const { data, error } = await supabase.rpc("get_profile_public_counts", { p_user_id: userId });
    if (error) return fallback;
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return fallback;
    return {
      communityPosts: Number(row.posts ?? 0),
      scans: Number(row.scans ?? 0),
      achievements: Number(row.achievements ?? 0),
      trades: tradeCount,
    };
  } catch {
    return fallback;
  }
}

async function loadFollowMeta(
  supabase: SupabaseClient<Database>,
  subjectId: string,
  viewerId: string | null
): Promise<{ followerCount: number; followingCount: number; viewerFollowsTarget: boolean }> {
  const [followers, following, viewerEdge] = await Promise.all([
    supabase
      .from("user_follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", subjectId),
    supabase
      .from("user_follows")
      .select("following_id", { count: "exact", head: true })
      .eq("follower_id", subjectId),
    viewerId && viewerId !== subjectId
      ? supabase
          .from("user_follows")
          .select("follower_id")
          .eq("follower_id", viewerId)
          .eq("following_id", subjectId)
          .maybeSingle()
      : Promise.resolve({ data: null as { follower_id: string } | null }),
  ]);

  return {
    followerCount: followers.count ?? 0,
    followingCount: following.count ?? 0,
    viewerFollowsTarget: !!viewerEdge.data,
  };
}

async function loadActivityHeatmapPayload(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<ActivityHeatmapPayload | null> {
  try {
    const year = new Date().getUTCFullYear();
    const { data, error } = await supabase.rpc("get_user_activity_heatmap", {
      p_user_id: userId,
      p_year: year,
    });
    if (error || data == null) return null;
    const raw = data as unknown;
    if (!Array.isArray(raw)) return null;
    const counts = raw.map((n) => (typeof n === "number" ? n : Number(n)));
    return { year, counts };
  } catch {
    return null;
  }
}

async function loadLastSeasonSummaryPayload(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<SocialProfilePayload["lastSeasonSummary"]> {
  const { seasonId, year } = getLastCompletedSeasonForDate(new Date());
  try {
    const { data, error } = await supabase.rpc("get_user_season_summary", {
      p_user_id: userId,
      p_year: year,
      p_season: seasonId,
    });
    if (error || !Array.isArray(data) || data.length === 0) return null;
    const row = data[0] as { summary_json?: unknown; generated_at?: string | null };
    const summary = (row.summary_json ?? {}) as SeasonSummaryJsonV1;
    return {
      seasonId,
      year,
      summary,
      generatedAt: row.generated_at ?? null,
    };
  } catch {
    return null;
  }
}

async function loadLatestYearInReviewPayload(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<SocialProfilePayload["lastYearInReview"]> {
  try {
    const { data, error } = await supabase.rpc("get_user_latest_year_in_review", {
      p_user_id: userId,
    });
    if (error || !Array.isArray(data) || data.length === 0) return null;
    const row = data[0] as {
      year?: number;
      summary_json?: unknown;
      generated_at?: string | null;
      viewed_at?: string | null;
    };
    if (row.year == null) return null;
    return {
      year: row.year,
      summary: (row.summary_json ?? {}) as YearInReviewJsonV1,
      generatedAt: row.generated_at ?? null,
      viewedAt: row.viewed_at ?? null,
    };
  } catch {
    return null;
  }
}

async function loadUserClubsPayload(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ clubs: ClubChip[]; primaryClubId: string | null }> {
  try {
    const { data, error } = await supabase.rpc("get_user_clubs", { p_user_id: userId });
    if (error || !Array.isArray(data)) return { clubs: [], primaryClubId: null };
    const ids = (data as { club_id?: string }[])
      .map((r) => (r.club_id != null ? String(r.club_id).trim() : ""))
      .filter(Boolean);
    const clubs = mapClubIdsToChips(ids);
    return { clubs, primaryClubId: pickPrimaryClubId(ids) };
  } catch {
    return { clubs: [], primaryClubId: null };
  }
}

async function loadTimelineEventsPayload(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<TimelineEventPayload[]> {
  try {
    const { data, error } = await supabase.rpc("get_user_timeline_events", {
      p_user_id: userId,
    });
    if (error || !Array.isArray(data)) return [];
    return data.map((row: Record<string, unknown>) => ({
      date: String(row.event_date ?? "").slice(0, 10),
      type: String(row.event_type ?? ""),
      label: String(row.label ?? ""),
      icon: String(row.icon ?? ""),
      metadata:
        row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : undefined,
    }));
  } catch {
    return [];
  }
}

async function loadSimilarCollectorsForSubject(
  supabase: SupabaseClient<Database>,
  subjectId: string
): Promise<NonNullable<SocialProfilePayload["similarCollectors"]>> {
  try {
    const { data, error } = await supabase.rpc("get_users_similarity_batch", {
      p_user_ids: [subjectId],
    });
    if (error || !data?.length) return [];
    const row = data[0];
    const ids = row.similar_user_ids ?? [];
    const scoreArr = row.similarity_scores ?? [];
    const top6 = ids.slice(0, 6);
    if (top6.length === 0) return [];

    const scoreBy = new Map<string, number>();
    top6.forEach((id, i) => {
      const s = scoreArr[i];
      if (typeof s === "number" && Number.isFinite(s)) {
        scoreBy.set(id, Math.round(s));
      }
    });

    const { data: profs } = await supabase
      .from("social_public_profiles")
      .select("user_id, username, avatar_url, display_name, handle")
      .in("user_id", top6);

    const { data: personas } = await supabase.rpc("get_users_persona_batch", {
      p_user_ids: top6,
    });

    const archetypesBySimilar = await loadCollectorArchetypesByUserIds(supabase, top6);
    const identityBySimilar = await loadCollectorIdentityMapByUserIds(supabase, top6);

    const profBy = new Map((profs ?? []).map((p) => [p.user_id, p]));
    const personaRows = Array.isArray(personas) ? personas : [];
    const personaBy = new Map(
      personaRows.map((r) => [r.user_id, r.persona_text as string | null])
    );

    const presenceBy = await loadSocialPresenceByUserIds(supabase, top6);

    const { data: stripRows } = await supabase.rpc("get_users_activity_recent_days_batch", {
      p_user_ids: top6,
      p_days: 30,
    });
    const stripBy = new Map<string, number[]>();
    for (const sr of stripRows ?? []) {
      const r = sr as { user_id?: string; counts?: unknown };
      if (!r.user_id || !Array.isArray(r.counts)) continue;
      stripBy.set(
        r.user_id,
        r.counts.map((n) => (typeof n === "number" ? n : Number(n)))
      );
    }

    return top6.map((uid) => {
      const p = profBy.get(uid);
      const pv2 = buildPersonaV2FromArchetypes(archetypesBySimilar[uid] ?? []);
      const idm = identityBySimilar[uid];
      return {
        userId: uid,
        similarityScore: scoreBy.get(uid) ?? 0,
        username: p?.username ?? null,
        displayName: p?.display_name?.trim() || null,
        handle: p?.handle?.trim() || null,
        avatarUrl: p?.avatar_url ?? null,
        personaText: personaBy.get(uid) ?? null,
        personaV2Label: pv2.personaV2Label,
        personaV2Summary: pv2.personaV2Summary,
        identityHeadline: idm?.identityHeadline ?? null,
        identitySummary: idm?.identitySummary ?? null,
        presence: profilePresenceFromLoad(presenceBy[uid]),
        activityHeatmapStrip: stripBy.get(uid),
      };
    });
  } catch {
    return [];
  }
}

/**
 * Loads the signed-in user's profile (email from `profiles`, public extras from projections).
 */
export async function loadSelfSocialProfile(
  supabase: SupabaseClient<Database>,
  user: User
): Promise<SocialProfilePayload | { error: string }> {
  const { data: row, error } = await supabase
    .from("profiles")
    .select(
      "id, username, avatar_url, email, display_name, handle, bio, location, website, favorite_card, favorite_set, favorite_color, joined_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  await supabase.rpc("ensure_social_public_profile_projection", { p_user_id: user.id });
  await ensureStatsFresh(supabase, user.id);

  const { data: pub } = await supabase
    .from("social_public_profiles")
    .select(
      "username, avatar_url, bio, favorite_sets, display_name, handle, location, website, favorite_card, favorite_set, favorite_color, joined_at, tier_slug"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const stats = await loadStats(supabase, user.id);
  const followMeta = await loadFollowMeta(supabase, user.id, user.id);
  const tierSlugSelf = pub?.tier_slug ?? null;
  const [activityCounts, badges, flairExtras, playTopDecks, grailCards, fandomSuggestions, personaTextSelf, personaV2Self, identityMapSelf] =
    await Promise.all([
      loadActivityCounts(supabase, user.id, stats.tradeCount),
      loadUserBadges(supabase, user.id),
      loadFlairExtras(supabase, user.id, tierSlugSelf),
      loadUserTopDeckStatsRpc(supabase, user.id),
      loadUserGrailCardsRpc(supabase, user.id),
      loadUserFandomSuggestionsRpc(supabase, user.id),
      loadUserPersonaRpc(supabase, user.id),
      loadPersonaV2ProfileRpc(supabase, user.id),
      loadIdentityMapProfileRpc(supabase, user.id),
    ]);
  const journeysFull = buildFullJourneyProfileRows(flairExtras.journeyRows);
  const { active: activeJourneys, completed: completedJourneys } = splitActiveAndCompleted(journeysFull);
  const collectionMastery = [
    ...buildFullBinderMasteryRows(flairExtras.collectionMasteryRows),
    ...buildFullSetCompletionRows(flairExtras.collectionMasteryRows),
  ];

  const [
    similarCollectors,
    presenceRows,
    activityHeatmap,
    timelineEvents,
    lastSeasonSummary,
    lastYearInReview,
    clubsPayload,
    reputationBlock,
    influenceBlock,
    badgesV2Block,
  ] = await Promise.all([
    loadSimilarCollectorsForSubject(supabase, user.id),
    loadSocialPresenceByUserIds(supabase, [user.id]),
    loadActivityHeatmapPayload(supabase, user.id),
    loadTimelineEventsPayload(supabase, user.id),
    loadLastSeasonSummaryPayload(supabase, user.id),
    loadLatestYearInReviewPayload(supabase, user.id),
    loadUserClubsPayload(supabase, user.id),
    loadReputationBlock(supabase, user.id),
    loadInfluenceBlock(supabase, user.id),
    loadBadgeV2Progress(supabase, user.id),
  ]);
  const presence = profilePresenceFromLoad(presenceRows[user.id]);
  const prPresenceRow = presenceRows[user.id];
  const presenceLabelSelf =
    prPresenceRow &&
    buildPresenceQualitativeLabel({
      nowMs: Date.now(),
      presenceOptOut: prPresenceRow.presenceOptOut,
      lastSeenAtIso: prPresenceRow.lastSeenAt,
      presenceState: prPresenceRow.presenceState,
      activityState: prPresenceRow.activityState,
    });

  const profile: SocialProfilePayload = {
    userId: user.id,
    username: pub?.username ?? row?.username ?? null,
    displayName: pub?.display_name ?? row?.display_name ?? null,
    handle: pub?.handle ?? row?.handle ?? null,
    avatarUrl: pub?.avatar_url ?? row?.avatar_url ?? null,
    email: row?.email ?? user.email ?? null,
    bio: pub?.bio ?? row?.bio ?? "",
    location: pub?.location ?? row?.location ?? null,
    website: pub?.website ?? row?.website ?? null,
    favoriteCard: pub?.favorite_card ?? row?.favorite_card ?? null,
    favoriteSet: pub?.favorite_set ?? row?.favorite_set ?? null,
    favoriteColor: pub?.favorite_color ?? row?.favorite_color ?? null,
    joinedAt: pub?.joined_at ?? row?.joined_at ?? null,
    favoriteSets: parseFavoriteSets(pub?.favorite_sets),
    tierSlug: tierSlugSelf,
    personaText: personaTextSelf,
    personaV2Label: personaV2Self.personaV2Label,
    personaV2Summary: personaV2Self.personaV2Summary,
    topArchetypes: personaV2Self.topArchetypes,
    identityHeadline: identityMapSelf.identityHeadline,
    identitySummary: identityMapSelf.identitySummary,
    identityTraits: identityMapSelf.identityTraits,
    identityClusters: identityMapSelf.identityClusters,
    identitySignals: identityMapSelf.identitySignals,
    identityArchetypeBlend: identityMapSelf.identityArchetypeBlend,
    presenceLabel: presenceLabelSelf ?? null,
    badges,
    reputationScore: flairExtras.reputationScore,
    activityStreak: flairExtras.activityStreak,
    earnedFlairKeys: flairExtras.earnedFlairKeys,
    journeys: journeysFull,
    activeJourneys,
    completedJourneys,
    collectionMastery,
    tradeReputation: flairExtras.tradeReputation ?? { ...EMPTY_TRADE_REPUTATION },
    playIdentity: flairExtras.playIdentity,
    playTopDecks: playTopDecks,
    collectionValue: flairExtras.collectionValue,
    grailCards,
    fandomIdentity: flairExtras.fandomIdentity,
    fandomSuggestions,
    stats,
    activityCounts,
    visibility: "self",
    followerCount: followMeta.followerCount,
    followingCount: followMeta.followingCount,
    viewerFollowsTarget: false,
    similarCollectors,
    presence,
    activityHeatmap,
    timelineEvents,
    lastSeasonSummary,
    lastYearInReview,
    clubs: clubsPayload.clubs,
    primaryClubId: clubsPayload.primaryClubId,
    reputation: reputationBlock,
    influence: influenceBlock,
    badgesV2: badgesV2Block,
  };

  return profile;
}

/**
 * Public profile for another user (projections + follow metadata). Requires authenticated client.
 */
export async function loadPublicSocialProfile(
  supabase: SupabaseClient<Database>,
  subjectUserId: string,
  viewer: User | null
): Promise<SocialProfilePayload> {
  const uid = subjectUserId.trim();
  await supabase.rpc("ensure_social_public_profile_projection", { p_user_id: uid });
  await ensureStatsFresh(supabase, uid);

  const { data: pub, error } = await supabase
    .from("social_public_profiles")
    .select(
      "user_id, username, avatar_url, bio, favorite_sets, display_name, handle, location, website, favorite_card, favorite_set, favorite_color, joined_at, tier_slug"
    )
    .eq("user_id", uid)
    .maybeSingle();

  if (error || !pub) {
    return stubPublicProfile(uid);
  }

  const stats = await loadStats(supabase, uid);
  const viewerId = viewer?.id ?? null;
  const followMeta = await loadFollowMeta(supabase, uid, viewerId);
  const tierSlugPub = pub.tier_slug ?? null;
  const [activityCounts, badges, flairExtras, playTopDecks, grailCardsPub, fandomSuggestionsPub, personaTextPub, personaV2Pub, identityMapPub] =
    await Promise.all([
      loadActivityCounts(supabase, uid, stats.tradeCount),
      loadUserBadges(supabase, uid),
      loadFlairExtras(supabase, uid, tierSlugPub),
      loadUserTopDeckStatsRpc(supabase, uid),
      loadUserGrailCardsRpc(supabase, uid),
      loadUserFandomSuggestionsRpc(supabase, uid),
      loadUserPersonaRpc(supabase, uid),
      loadPersonaV2ProfileRpc(supabase, uid),
      loadIdentityMapProfileRpc(supabase, uid),
    ]);
  const journeysFull = buildFullJourneyProfileRows(flairExtras.journeyRows);
  const { active: activeJourneys, completed: completedJourneys } = splitActiveAndCompleted(journeysFull);
  const collectionMastery = [
    ...buildFullBinderMasteryRows(flairExtras.collectionMasteryRows),
    ...buildFullSetCompletionRows(flairExtras.collectionMasteryRows),
  ];

  const [
    similarCollectors,
    presenceRows,
    activityHeatmap,
    timelineEvents,
    lastSeasonSummary,
    lastYearInReview,
    clubsPayloadPub,
    reputationBlockPub,
    influenceBlockPub,
    badgesV2BlockPub,
  ] = await Promise.all([
    loadSimilarCollectorsForSubject(supabase, uid),
    loadSocialPresenceByUserIds(supabase, [uid]),
    loadActivityHeatmapPayload(supabase, uid),
    loadTimelineEventsPayload(supabase, uid),
    loadLastSeasonSummaryPayload(supabase, uid),
    loadLatestYearInReviewPayload(supabase, uid),
    loadUserClubsPayload(supabase, uid),
    loadReputationBlock(supabase, uid),
    loadInfluenceBlock(supabase, uid),
    loadBadgeV2Progress(supabase, uid),
  ]);
  const presence = profilePresenceFromLoad(presenceRows[uid]);
  const prPubRow = presenceRows[uid];
  const presenceLabelPub =
    prPubRow &&
    buildPresenceQualitativeLabel({
      nowMs: Date.now(),
      presenceOptOut: prPubRow.presenceOptOut,
      lastSeenAtIso: prPubRow.lastSeenAt,
      presenceState: prPubRow.presenceState,
      activityState: prPubRow.activityState,
    });

  return {
    userId: uid,
    username: pub.username ?? null,
    displayName: pub.display_name ?? null,
    handle: pub.handle ?? null,
    avatarUrl: pub.avatar_url ?? null,
    bio: pub.bio ?? "",
    location: pub.location ?? null,
    website: pub.website ?? null,
    favoriteCard: pub.favorite_card ?? null,
    favoriteSet: pub.favorite_set ?? null,
    favoriteColor: pub.favorite_color ?? null,
    joinedAt: pub.joined_at ?? null,
    favoriteSets: parseFavoriteSets(pub.favorite_sets),
    tierSlug: tierSlugPub,
    personaText: personaTextPub,
    personaV2Label: personaV2Pub.personaV2Label,
    personaV2Summary: personaV2Pub.personaV2Summary,
    topArchetypes: personaV2Pub.topArchetypes,
    identityHeadline: identityMapPub.identityHeadline,
    identitySummary: identityMapPub.identitySummary,
    identityTraits: identityMapPub.identityTraits,
    identityClusters: identityMapPub.identityClusters,
    identitySignals: identityMapPub.identitySignals,
    identityArchetypeBlend: identityMapPub.identityArchetypeBlend,
    presenceLabel: presenceLabelPub ?? null,
    badges,
    reputationScore: flairExtras.reputationScore,
    activityStreak: flairExtras.activityStreak,
    earnedFlairKeys: flairExtras.earnedFlairKeys,
    journeys: journeysFull,
    activeJourneys,
    completedJourneys,
    collectionMastery,
    tradeReputation: flairExtras.tradeReputation ?? { ...EMPTY_TRADE_REPUTATION },
    playIdentity: flairExtras.playIdentity,
    playTopDecks: playTopDecks,
    collectionValue: flairExtras.collectionValue,
    grailCards: grailCardsPub,
    fandomIdentity: flairExtras.fandomIdentity,
    fandomSuggestions: fandomSuggestionsPub,
    stats,
    activityCounts,
    visibility: "public",
    followerCount: followMeta.followerCount,
    followingCount: followMeta.followingCount,
    viewerFollowsTarget: followMeta.viewerFollowsTarget,
    similarCollectors,
    presence,
    activityHeatmap,
    timelineEvents,
    lastSeasonSummary,
    lastYearInReview,
    clubs: clubsPayloadPub.clubs,
    primaryClubId: clubsPayloadPub.primaryClubId,
    reputation: reputationBlockPub,
    influence: influenceBlockPub,
    badgesV2: badgesV2BlockPub,
  };
}
