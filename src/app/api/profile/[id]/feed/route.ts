import { loadTopScanMilestonesByUserIds } from "@/lib/badges/load-top-scan-milestones";
import { enrichUsersWithFlair } from "@/lib/flair/enrich-user-flair-batch";
import { presenceSnapshotFromFlair } from "@/lib/presence/flair-presence-fields";
import { resolveAuthorFromSocial } from "@/lib/profile/resolveAuthor";
import { loadSocialGraphV4ByUserIds } from "@/lib/social/load-social-graph-v4-batch";
import { parseSocialGraphV4Narrative, socialGraphV4FeedEchoLine } from "@/lib/social/social-graph-v4";
import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function GET_handler(
  request: Request,
  context: { params: Record<string, string> }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profileId = context.params.id?.trim();
  if (!profileId || !isUuidString(profileId)) {
    return NextResponse.json({ error: "Invalid profile id" }, { status: 400 });
  }

  const url = new URL(request.url);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));
  const before = url.searchParams.get("before")?.trim();

  let feedQuery = supabase
    .from("feed_events")
    .select("id, kind, actor_id, subject_id, payload, created_at")
    .eq("actor_id", profileId);
  if (before && before.length > 0) {
    feedQuery = feedQuery.lt("created_at", before);
  }
  const { data: rows, error } = await feedQuery.order("created_at", { ascending: false }).limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = rows ?? [];
  let actorName = "Anonymous Trainer";
  let actorTierSlug: string | null = null;
  let actorTopScanMilestone: string | null = null;
  let actorReputationScore = 0;
  let actorActivityStreak = 0;
  let actorTopFlairKey: string | null = null;
  let actorTopSeasonalFlairKey: string | null = null;
  let actorTopSeasonalBadgeKey: string | null = null;
  let actorSeasonalBadgeKeys: string[] = [];
  let actorTopJourneyBadgeKey: string | null = null;
  let actorJourneyProgressSummary: string | null = null;
  let actorTopCollectionMasteryBadgeKey: string | null = null;
  let actorCollectionMasterySummary: string | null = null;
  let actorTradeReputationScoreSummary: string | null = null;
  let actorTopTradeBadgeKey: string | null = null;
  let actorFavoriteFormatId: string | null = null;
  let actorFavoriteArchetypeId: string | null = null;
  let actorFavoriteDeckName: string | null = null;
  let actorTopPlayBadgeKey: string | null = null;
  let actorSecondaryPlayFlairKey: string | null = null;
  let actorValueIdentitySummary: string | null = null;
  let actorRarityProfileLabel: string | null = null;
  let actorTopValueBadgeKey: string | null = null;
  let actorGrailHighlightSummary: string | null = null;
  let actorFavoriteSetId: string | null = null;
  let actorFavoriteEraId: string | null = null;
  let actorFavoriteArtistId: string | null = null;
  let actorFavoriteCharacterId: string | null = null;
  let actorFavoriteThemeId: string | null = null;
  let actorTopFandomBadgeKey: string | null = null;
  let actorFandomSummary: string | null = null;
  let actorPersonaText: string | null = null;
  let actorClubsSummary: string | null = null;
  let actorPresence = {
    optedOut: false,
    lastSeenAt: null as string | null,
    lastActivityAt: null as string | null,
    lastActivityKey: null as string | null,
  };
  if (profileId) {
    const { data: pub } = await supabase
      .from("social_public_profiles")
      .select("display_name, handle, username, tier_slug")
      .eq("user_id", profileId)
      .maybeSingle();
    if (pub) {
      actorName = resolveAuthorFromSocial(pub);
      actorTierSlug = pub.tier_slug;
    }
    const m = await loadTopScanMilestonesByUserIds(supabase, [profileId]);
    actorTopScanMilestone = m[profileId] ?? null;
    const fx = await enrichUsersWithFlair(supabase, [profileId], {
      [profileId]: actorTierSlug,
    });
    const row = fx[profileId];
    actorReputationScore = row?.reputationScore ?? 0;
    actorActivityStreak = row?.activityStreak ?? 0;
    actorTopFlairKey = row?.topFlairKey ?? null;
    actorTopSeasonalFlairKey = row?.topSeasonalFlairKey ?? null;
    actorTopSeasonalBadgeKey = row?.topSeasonalBadgeKey ?? null;
    actorSeasonalBadgeKeys = row?.seasonalBadgeKeys ?? [];
    actorTopJourneyBadgeKey = row?.topJourneyBadgeKey ?? null;
    actorJourneyProgressSummary = row?.journeyProgressSummary ?? null;
    actorTopCollectionMasteryBadgeKey = row?.topCollectionMasteryBadgeKey ?? null;
    actorCollectionMasterySummary = row?.collectionMasterySummary ?? null;
    actorTradeReputationScoreSummary = row?.tradeReputationScoreSummary ?? null;
    actorTopTradeBadgeKey = row?.topTradeBadgeKey ?? null;
    actorFavoriteFormatId = row?.favoriteFormatId ?? null;
    actorFavoriteArchetypeId = row?.favoriteArchetypeId ?? null;
    actorFavoriteDeckName = row?.favoriteDeckName ?? null;
    actorTopPlayBadgeKey = row?.topPlayBadgeKey ?? null;
    actorSecondaryPlayFlairKey = row?.secondaryPlayFlairKey ?? null;
    actorValueIdentitySummary = row?.valueIdentitySummary ?? null;
    actorRarityProfileLabel = row?.rarityProfileLabel ?? null;
    actorTopValueBadgeKey = row?.topValueBadgeKey ?? null;
    actorGrailHighlightSummary = row?.grailHighlightSummary ?? null;
    actorFavoriteSetId = row?.favoriteSetId ?? null;
    actorFavoriteEraId = row?.favoriteEraId ?? null;
    actorFavoriteArtistId = row?.favoriteArtistId ?? null;
    actorFavoriteCharacterId = row?.favoriteCharacterId ?? null;
    actorFavoriteThemeId = row?.favoriteThemeId ?? null;
    actorTopFandomBadgeKey = row?.topFandomBadgeKey ?? null;
    actorFandomSummary = row?.fandomSummary ?? null;
    actorPersonaText = row?.personaText ?? null;
    actorClubsSummary = row?.clubsSummary ?? null;
    actorPresence = presenceSnapshotFromFlair(row);
  }

  const feedEventIds = list.map((r) => r.id).filter((id): id is string => Boolean(id));
  const savedIdSet = new Set<string>();
  if (feedEventIds.length > 0) {
    const { data: saveRows } = await supabase
      .from("feed_event_saves")
      .select("feed_event_id")
      .eq("user_id", user.id)
      .in("feed_event_id", feedEventIds);
    for (const s of saveRows ?? []) {
      if (s.feed_event_id) savedIdSet.add(s.feed_event_id);
    }
  }

  const graphByActor = await loadSocialGraphV4ByUserIds(supabase, [profileId]);
  const actorSocialGraphEcho =
    socialGraphV4FeedEchoLine(graphByActor[profileId] ?? parseSocialGraphV4Narrative(null)) ?? null;

  const linesByEventId: Record<string, string> = {};
  if (list.length > 0) {
    const p_events = list.map((r) => ({
      id: r.id,
      kind: r.kind,
      subject_id: r.subject_id,
      created_at: r.created_at,
    }));
    const { data: linesJson, error: linesErr } = await supabase.rpc("get_profile_feed_v3_signal_lines", {
      p_actor_id: profileId,
      p_events: p_events,
    });
    if (!linesErr && linesJson && typeof linesJson === "object" && !Array.isArray(linesJson)) {
      for (const [k, v] of Object.entries(linesJson as Record<string, unknown>)) {
        if (typeof v === "string" && v.trim().length > 0) {
          linesByEventId[k] = v.trim();
        }
      }
    }
  }

  const items = list.map((r) => ({
    ...r,
    actor_name: actorName,
    actor_tier_slug: actorTierSlug,
    actor_top_scan_milestone: actorTopScanMilestone,
    actor_reputation_score: actorReputationScore,
    actor_activity_streak: actorActivityStreak,
    actor_top_flair_key: actorTopFlairKey,
    actor_top_seasonal_flair_key: actorTopSeasonalFlairKey,
    actor_top_seasonal_badge_key: actorTopSeasonalBadgeKey,
    actor_seasonal_badge_keys: actorSeasonalBadgeKeys,
    actor_top_journey_badge_key: actorTopJourneyBadgeKey,
    actor_journey_progress_summary: actorJourneyProgressSummary,
    actor_top_collection_mastery_badge_key: actorTopCollectionMasteryBadgeKey,
    actor_collection_mastery_summary: actorCollectionMasterySummary,
    actor_trade_reputation_score_summary: actorTradeReputationScoreSummary,
    actor_top_trade_badge_key: actorTopTradeBadgeKey,
    actor_favorite_format_id: actorFavoriteFormatId,
    actor_favorite_archetype_id: actorFavoriteArchetypeId,
    actor_favorite_deck_name: actorFavoriteDeckName,
    actor_top_play_badge_key: actorTopPlayBadgeKey,
    actor_secondary_play_flair_key: actorSecondaryPlayFlairKey,
    actor_value_identity_summary: actorValueIdentitySummary,
    actor_rarity_profile_label: actorRarityProfileLabel,
    actor_top_value_badge_key: actorTopValueBadgeKey,
    actor_grail_highlight_summary: actorGrailHighlightSummary,
    actor_favorite_set_id: actorFavoriteSetId,
    actor_favorite_era_id: actorFavoriteEraId,
    actor_favorite_artist_id: actorFavoriteArtistId,
    actor_favorite_character_id: actorFavoriteCharacterId,
    actor_favorite_theme_id: actorFavoriteThemeId,
    actor_top_fandom_badge_key: actorTopFandomBadgeKey,
    actor_fandom_summary: actorFandomSummary,
    actor_persona_text: actorPersonaText,
    actor_clubs_summary: actorClubsSummary,
    actor_presence: actorPresence,
    actor_social_graph_echo: actorSocialGraphEcho,
    feed_v3_signal_line: linesByEventId[r.id] ?? null,
    viewer_has_saved: savedIdSet.has(r.id),
  }));

  return NextResponse.json({ items });
}

export const GET = defineRoute("GET /api/profile/[id]/feed", GET_handler);
