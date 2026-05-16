import { errorJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { loadTopScanMilestonesByUserIds } from "@/lib/badges/load-top-scan-milestones";
import type { FeedItemDTO } from "@/lib/dto/catalog";
import { enrichUsersWithFlair } from "@/lib/flair/enrich-user-flair-batch";
import { presenceSnapshotFromFlair } from "@/lib/presence/flair-presence-fields";
import { rankFeedItemsV5 } from "@/lib/feed/engagement-v5";
import { loadFeedV3SupplementRows } from "@/lib/feed/feed-v3-supplement";
import { buildFeedV3SupplementSignalLine } from "@/lib/feed/feed-v3-ui-copy";
import { compositeReputation01 } from "@/lib/reputation/composite-score";
import { parseSocialGraphV4Narrative, socialGraphV4FeedEchoLine } from "@/lib/social/social-graph-v4";
import { loadSocialGraphV4ByUserIds } from "@/lib/social/load-social-graph-v4-batch";
import { resolveAuthorFromSocial } from "@/lib/profile/resolveAuthor";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/feed", surfaceName: "feed" } as const;

export const dynamic = "force-dynamic";

async function GET_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  void supabase.rpc("refresh_user_presence", {
    p_user_id: session.userId,
    p_state: "online",
    p_device: "web",
  });
  void supabase.rpc("refresh_collector_room", {
    p_user_id: session.userId,
    p_room_type: "live_feed_room",
    p_topic_key: "",
  });

  const url = new URL(request.url);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "24", 10)));
  const before = url.searchParams.get("before");
  const debug = url.searchParams.get("debug") === "1" || url.searchParams.get("debug") === "true";
  const useMl = url.searchParams.get("ml") !== "0";

  const [{ data, error }, followRes, mutualRes] = await Promise.all([
    supabase.rpc("get_global_feed_v3", {
      p_limit: limit,
      p_before: before && before.length > 0 ? before : null,
    }),
    supabase.from("user_follows").select("following_id").eq("follower_id", session.userId).limit(200),
    supabase
      .from("social_mutual_pairs")
      .select("user_low, user_high")
      .or(`user_low.eq.${session.userId},user_high.eq.${session.userId}`)
      .limit(400),
  ]);

  if (error) {
    return errorJson(ctx, error.message, 500);
  }

  const raw = data as unknown;
  const baseItems = Array.isArray(raw) ? raw : [];
  const followingIds = (followRes.data ?? []).map((r) => r.following_id).filter(Boolean);
  const mutualIds = new Set<string>();
  for (const row of mutualRes.data ?? []) {
    if (row.user_low === session.userId) mutualIds.add(row.user_high);
    else if (row.user_high === session.userId) mutualIds.add(row.user_low);
  }
  const supplement = await loadFeedV3SupplementRows(supabase, session.userId, {
    followingIds,
    mutualIds: [...mutualIds],
  });
  const merged = [...(baseItems as Parameters<typeof rankFeedItemsV5>[1]), ...supplement];
  const actorIdsForRank = [
    ...new Set(
      (merged as { actor_id?: string }[])
        .map((x) => x.actor_id)
        .filter((x): x is string => Boolean(x))
    ),
  ];
  const reputationByActor: Record<string, number> = {};
  if (actorIdsForRank.length > 0) {
    const { data: repRows } = await supabase.rpc("get_users_reputation_graph_batch", {
      p_user_ids: actorIdsForRank,
    });
    for (const row of repRows ?? []) {
      const r = row as {
        user_id: string;
        helpfulness_score: number;
        expertise_score: number;
        positivity_score: number;
        reliability_score: number;
        contribution_score: number;
      };
      reputationByActor[r.user_id] = compositeReputation01({
        helpfulness_score: r.helpfulness_score,
        expertise_score: r.expertise_score,
        positivity_score: r.positivity_score,
        reliability_score: r.reliability_score,
        contribution_score: r.contribution_score,
      });
    }
  }

  const { items: ranked, debug: rankDebug } = rankFeedItemsV5(
    session.userId,
    merged as Parameters<typeof rankFeedItemsV5>[1],
    { useMl },
    { reputationByActor, trustByActor: reputationByActor }
  );

  if (debug && ranked.length === rankDebug.length) {
    ranked.forEach((it, i) => {
      const meta = rankDebug[i];
      if (meta) Object.assign(it as Record<string, unknown>, { ranking: meta });
    });
  }

  const items = ranked.slice(0, limit);

  let hybridAcc = 0;
  let persBoosts = 0;
  let predAcc = 0;
  let affAcc = 0;
  for (let i = 0; i < items.length && i < rankDebug.length; i++) {
    const m = rankDebug[i];
    if (m) {
      hybridAcc += m.hybrid;
      if (m.personalized >= 0.18) persBoosts++;
      if (m.v5) {
        predAcc += m.v5.interest_velocity;
        affAcc += m.v5.showcase_engagement;
      } else if (m.v4) {
        predAcc += m.v4.predicted_engagement;
        affAcc += m.v4.affinity;
      }
    }
  }
  const n = Math.min(items.length, rankDebug.length || items.length);
  const avgHybrid = n > 0 ? hybridAcc / n : 0;
  const avgPred = n > 0 ? predAcc / n : 0;
  const avgAff = n > 0 ? affAcc / n : 0;

  mcaLog.event(
    "feed.rank.reputation",
    {
      viewerId: session.userId,
      actors: Object.keys(reputationByActor).length,
    },
    CTX
  );
  mcaLog.event(
    "feed.rank.compute",
    {
      viewerId: session.userId,
      limit,
      itemCount: Array.isArray(items) ? items.length : 0,
      ranking: "v5_engagement_v3sql",
    },
    CTX
  );
  mcaLog.event(
    "feed.rank.prediction",
    {
      viewerId: session.userId,
      itemCount: items.length,
      avgPredicted: avgPred,
    },
    CTX
  );
  mcaLog.event(
    "feed.rank.affinity",
    {
      viewerId: session.userId,
      itemCount: items.length,
      avgAffinity: avgAff,
    },
    CTX
  );
  mcaLog.event(
    "feed.rank.hybrid",
    {
      viewerId: session.userId,
      itemCount: items.length,
      avgHybrid,
      useMl,
      layer: "v4+v3sql",
    },
    CTX
  );
  mcaLog.event(
    "feed.rank.personalized",
    {
      viewerId: session.userId,
      boostedCount: persBoosts,
      itemCount: items.length,
    },
    CTX
  );
  mcaLog.event("feed.view", { viewerId: session.userId, limit }, CTX);

  const itemRows = items as { actor_id?: string }[];
  const actorIds = [
    ...new Set(itemRows.map((x) => x.actor_id).filter((x): x is string => Boolean(x))),
  ];
  const byActor: Record<
    string,
    {
      display_name: string | null;
      handle: string | null;
      username: string | null;
      tier_slug: string | null;
    }
  > = {};
  if (actorIds.length > 0) {
    const { data: nameRows } = await supabase
      .from("social_public_profiles")
      .select("user_id, display_name, handle, username, tier_slug")
      .in("user_id", actorIds);
    for (const row of nameRows ?? []) {
      byActor[row.user_id] = {
        display_name: row.display_name,
        handle: row.handle,
        username: row.username,
        tier_slug: row.tier_slug,
      };
    }
  }
  const milestoneByActor =
    actorIds.length > 0 ? await loadTopScanMilestonesByUserIds(supabase, actorIds) : {};
  const tierByActor: Record<string, string | null> = {};
  for (const id of actorIds) {
    tierByActor[id] = byActor[id]?.tier_slug ?? null;
  }
  const flairByActor =
    actorIds.length > 0 ? await enrichUsersWithFlair(supabase, actorIds, tierByActor) : {};
  const graphV4ByActor =
    actorIds.length > 0 ? await loadSocialGraphV4ByUserIds(supabase, actorIds) : {};

  const feedEventIds = itemRows
    .map((x) => (x as { id?: string }).id)
    .filter((x): x is string => Boolean(x));
  const savedIdSet = new Set<string>();
  if (feedEventIds.length > 0) {
    const { data: saveRows } = await supabase
      .from("feed_event_saves")
      .select("feed_event_id")
      .eq("user_id", session.userId)
      .in("feed_event_id", feedEventIds);
    for (const s of saveRows ?? []) {
      if (s.feed_event_id) savedIdSet.add(s.feed_event_id);
    }
  }
  const { data: weekActivityRows } =
    actorIds.length > 0
      ? await supabase.rpc("get_users_activity_week_count_batch", {
          p_user_ids: actorIds,
        })
      : { data: null as unknown };
  const weekActivityBy = new Map<string, number>();
  const weekList = Array.isArray(weekActivityRows) ? weekActivityRows : [];
  for (const row of weekList) {
    const w = row as { user_id?: string; event_count?: number | string };
    if (!w.user_id || w.event_count == null) continue;
    const n = typeof w.event_count === "number" ? w.event_count : Number(w.event_count);
    if (Number.isFinite(n)) weekActivityBy.set(w.user_id, n);
  }
  for (const it of itemRows) {
    const r = it as Record<string, unknown>;
    const kind = typeof r.kind === "string" ? r.kind : "";
    const extraLine = buildFeedV3SupplementSignalLine(kind, r.payload);
    if (extraLine && (typeof r.feed_v3_signal_line !== "string" || !String(r.feed_v3_signal_line).trim())) {
      r.feed_v3_signal_line = extraLine;
    }
    const aid = r.actor_id;
    if (typeof aid === "string" && byActor[aid]) {
      r.actor_name = resolveAuthorFromSocial(byActor[aid]);
      r.actor_tier_slug = byActor[aid].tier_slug;
      r.actor_top_scan_milestone = milestoneByActor[aid] ?? null;
      const fx = flairByActor[aid];
      r.actor_reputation_score = fx?.reputationScore ?? 0;
      r.actor_activity_streak = fx?.activityStreak ?? 0;
      r.actor_top_flair_key = fx?.topFlairKey ?? null;
      r.actor_top_seasonal_flair_key = fx?.topSeasonalFlairKey ?? null;
      r.actor_top_seasonal_badge_key = fx?.topSeasonalBadgeKey ?? null;
      r.actor_seasonal_badge_keys = fx?.seasonalBadgeKeys ?? [];
      r.actor_top_journey_badge_key = fx?.topJourneyBadgeKey ?? null;
      r.actor_journey_progress_summary = fx?.journeyProgressSummary ?? null;
      r.actor_top_collection_mastery_badge_key = fx?.topCollectionMasteryBadgeKey ?? null;
      r.actor_collection_mastery_summary = fx?.collectionMasterySummary ?? null;
      r.actor_trade_reputation_score_summary = fx?.tradeReputationScoreSummary ?? null;
      r.actor_top_trade_badge_key = fx?.topTradeBadgeKey ?? null;
      r.actor_favorite_format_id = fx?.favoriteFormatId ?? null;
      r.actor_favorite_archetype_id = fx?.favoriteArchetypeId ?? null;
      r.actor_favorite_deck_name = fx?.favoriteDeckName ?? null;
      r.actor_top_play_badge_key = fx?.topPlayBadgeKey ?? null;
      r.actor_secondary_play_flair_key = fx?.secondaryPlayFlairKey ?? null;
      r.actor_value_identity_summary = fx?.valueIdentitySummary ?? null;
      r.actor_rarity_profile_label = fx?.rarityProfileLabel ?? null;
      r.actor_top_value_badge_key = fx?.topValueBadgeKey ?? null;
      r.actor_grail_highlight_summary = fx?.grailHighlightSummary ?? null;
      r.actor_favorite_set_id = fx?.favoriteSetId ?? null;
      r.actor_favorite_era_id = fx?.favoriteEraId ?? null;
      r.actor_favorite_artist_id = fx?.favoriteArtistId ?? null;
      r.actor_favorite_character_id = fx?.favoriteCharacterId ?? null;
      r.actor_favorite_theme_id = fx?.favoriteThemeId ?? null;
      r.actor_top_fandom_badge_key = fx?.topFandomBadgeKey ?? null;
      r.actor_fandom_summary = fx?.fandomSummary ?? null;
      r.actor_persona_text = fx?.personaText ?? null;
      r.actor_persona_v2_label = fx?.personaV2Label ?? null;
      r.actor_persona_v2_summary = fx?.personaV2Summary ?? null;
      r.actor_identity_headline = fx?.identityHeadline ?? null;
      r.actor_identity_summary = fx?.identitySummary ?? null;
      r.actor_presence = presenceSnapshotFromFlair(fx);
      r.actor_presence_label = fx?.presenceLabel ?? null;
      r.actor_week_activity_count = weekActivityBy.get(aid) ?? 0;
      r.actor_season_highlight = fx?.seasonHighlight ?? null;
      r.actor_clubs_summary = fx?.clubsSummary ?? null;
      r.actor_social_graph_echo =
        socialGraphV4FeedEchoLine(graphV4ByActor[aid] ?? parseSocialGraphV4Narrative(null)) ?? null;
      r.actor_reputation_summary = fx?.reputationSummary ?? null;
      r.actor_influence_summary = fx?.influenceSummary ?? null;
      r.actor_badge_highlight = fx?.badgeHighlight ?? null;
    } else {
      r.actor_name = "Anonymous Trainer";
      r.actor_tier_slug = null;
      r.actor_top_scan_milestone = null;
      r.actor_reputation_score = 0;
      r.actor_reputation_summary = null;
      r.actor_influence_summary = null;
      r.actor_badge_highlight = null;
      r.actor_activity_streak = 0;
      r.actor_top_flair_key = null;
      r.actor_top_seasonal_flair_key = null;
      r.actor_top_seasonal_badge_key = null;
      r.actor_seasonal_badge_keys = [];
      r.actor_top_journey_badge_key = null;
      r.actor_journey_progress_summary = null;
      r.actor_top_collection_mastery_badge_key = null;
      r.actor_collection_mastery_summary = null;
      r.actor_trade_reputation_score_summary = null;
      r.actor_top_trade_badge_key = null;
      r.actor_favorite_format_id = null;
      r.actor_favorite_archetype_id = null;
      r.actor_favorite_deck_name = null;
      r.actor_top_play_badge_key = null;
      r.actor_secondary_play_flair_key = null;
      r.actor_value_identity_summary = null;
      r.actor_rarity_profile_label = null;
      r.actor_top_value_badge_key = null;
      r.actor_grail_highlight_summary = null;
      r.actor_favorite_set_id = null;
      r.actor_favorite_era_id = null;
      r.actor_favorite_artist_id = null;
      r.actor_favorite_character_id = null;
      r.actor_favorite_theme_id = null;
      r.actor_top_fandom_badge_key = null;
      r.actor_fandom_summary = null;
      r.actor_persona_text = null;
      r.actor_persona_v2_label = null;
      r.actor_persona_v2_summary = null;
      r.actor_identity_headline = null;
      r.actor_identity_summary = null;
      r.actor_season_highlight = null;
      r.actor_clubs_summary = null;
      r.actor_presence = {
        optedOut: false,
        lastSeenAt: null,
        lastActivityAt: null,
        lastActivityKey: null,
      };
      r.actor_presence_label = null;
      r.actor_week_activity_count = 0;
      r.actor_social_graph_echo = null;
    }
    const fid = typeof r.id === "string" ? r.id : "";
    r.viewer_has_saved = fid.length > 0 ? savedIdSet.has(fid) : false;
  }

  let mlAcc = 0;
  let mlN = 0;
  let mutualAcc = 0;
  let engAcc = 0;
  for (const row of items.slice(0, 24)) {
    if (!row || typeof row !== "object") continue;
    const sig = (row as { signals?: Record<string, unknown> }).signals;
    if (sig && typeof sig.ml_assist === "number") {
      mlAcc += sig.ml_assist;
      mlN++;
    }
    if (sig && typeof sig.mutual === "number") mutualAcc += sig.mutual > 0 ? 1 : 0;
    if (sig && typeof sig.engagement === "number") engAcc += sig.engagement;
  }
  mcaLog.event(
    "feed.rank.ml",
    {
      viewerId: session.userId,
      itemCount: items.length,
      mlAssistAvg: mlN > 0 ? mlAcc / mlN : 0,
    },
    CTX
  );
  mcaLog.event(
    "feed.rank.signal",
    {
      viewerId: session.userId,
      mutualHits: mutualAcc,
      engagementScoreSum: engAcc,
    },
    CTX
  );

  return NextResponse.json({
    success: true,
    context_id: ctx.contextId,
    items: items as FeedItemDTO[],
  });
}

export const GET = defineRouteSimple("GET /api/feed", GET_handler);
