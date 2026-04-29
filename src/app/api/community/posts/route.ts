import { loadTopScanMilestonesByUserIds } from "@/lib/badges/load-top-scan-milestones";
import { enrichUsersWithFlair } from "@/lib/flair/enrich-user-flair-batch";
import { presenceSnapshotFromFlair } from "@/lib/presence/flair-presence-fields";
import { resolveAuthorFromSocial } from "@/lib/profile/resolveAuthor";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/community/posts", surfaceName: "community" } as const;

export const dynamic = "force-dynamic";

const MAX_BODY = 8000;

async function GET_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(40, Math.max(1, parseInt(url.searchParams.get("limit") ?? "24", 10)));
  const authorFilter = url.searchParams.get("author_id")?.trim();
  if (authorFilter && !isUuidString(authorFilter)) {
    return NextResponse.json({ error: "Invalid author_id" }, { status: 400 });
  }

  let q = supabase.from("community_posts").select("id, body, created_at, updated_at, author_id");
  if (authorFilter) {
    q = q.eq("author_id", authorFilter);
  }
  const { data: posts, error } = await q.order("created_at", { ascending: false }).limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = posts ?? [];
  if (rows.length === 0) {
    return NextResponse.json({ posts: [] });
  }

  const authorIds = [...new Set(rows.map((p) => p.author_id))];
  const postIds = rows.map((p) => p.id);

  const [profilesRes, likesRes, commentsRes, reactRes] = await Promise.all([
    supabase
      .from("social_public_profiles")
      .select("user_id, username, avatar_url, display_name, handle, tier_slug")
      .in("user_id", authorIds),
    supabase.from("community_post_likes").select("post_id, user_id").in("post_id", postIds),
    supabase
      .from("community_post_comments")
      .select("post_id")
      .in("post_id", postIds),
    supabase.from("community_post_reactions").select("post_id, reaction, user_id").in("post_id", postIds),
  ]);

  const profileByUser: Record<
    string,
    {
      username: string | null;
      avatar_url: string | null;
      display_name: string | null;
      handle: string | null;
      tier_slug: string | null;
    }
  > = {};
  for (const p of profilesRes.data ?? []) {
    profileByUser[p.user_id] = {
      username: p.username,
      avatar_url: p.avatar_url,
      display_name: p.display_name,
      handle: p.handle,
      tier_slug: p.tier_slug,
    };
  }

  const milestones =
    authorIds.length > 0 ? await loadTopScanMilestonesByUserIds(supabase, authorIds) : {};
  const tierByAuthor: Record<string, string | null> = {};
  for (const id of authorIds) {
    tierByAuthor[id] = profileByUser[id]?.tier_slug ?? null;
  }
  const flairByAuthor =
    authorIds.length > 0 ? await enrichUsersWithFlair(supabase, authorIds, tierByAuthor) : {};

  const likeCount: Record<string, number> = {};
  const likedByMe = new Set<string>();
  for (const row of likesRes.data ?? []) {
    likeCount[row.post_id] = (likeCount[row.post_id] ?? 0) + 1;
    if (row.user_id === user.id) likedByMe.add(row.post_id);
  }

  const commentCount: Record<string, number> = {};
  for (const row of commentsRes.data ?? []) {
    commentCount[row.post_id] = (commentCount[row.post_id] ?? 0) + 1;
  }

  const reactionCounts: Record<string, Record<string, number>> = {};
  const viewerReactionsByPost: Record<string, string[]> = {};
  for (const row of reactRes.data ?? []) {
    if (!reactionCounts[row.post_id]) reactionCounts[row.post_id] = {};
    const rc = reactionCounts[row.post_id];
    if (rc) rc[row.reaction] = (rc[row.reaction] ?? 0) + 1;
    if (row.user_id === user.id) {
      if (!viewerReactionsByPost[row.post_id]) viewerReactionsByPost[row.post_id] = [];
      viewerReactionsByPost[row.post_id]?.push(row.reaction);
    }
  }

  const enriched = rows.map((p) => {
    const fx = flairByAuthor[p.author_id];
    return {
    ...p,
    author_display: resolveAuthorFromSocial(profileByUser[p.author_id] ?? null),
    author_avatar_url: profileByUser[p.author_id]?.avatar_url ?? null,
    author_tier_slug: profileByUser[p.author_id]?.tier_slug ?? null,
    author_top_scan_milestone: milestones[p.author_id] ?? null,
    author_reputation_score: fx?.reputationScore ?? 0,
    author_activity_streak: fx?.activityStreak ?? 0,
    author_top_flair_key: fx?.topFlairKey ?? null,
    author_top_seasonal_flair_key: fx?.topSeasonalFlairKey ?? null,
    author_top_seasonal_badge_key: fx?.topSeasonalBadgeKey ?? null,
    author_seasonal_badge_keys: fx?.seasonalBadgeKeys ?? [],
    author_top_journey_badge_key: fx?.topJourneyBadgeKey ?? null,
    author_journey_progress_summary: fx?.journeyProgressSummary ?? null,
    author_top_collection_mastery_badge_key: fx?.topCollectionMasteryBadgeKey ?? null,
    author_collection_mastery_summary: fx?.collectionMasterySummary ?? null,
    author_trade_reputation_score_summary: fx?.tradeReputationScoreSummary ?? null,
    author_top_trade_badge_key: fx?.topTradeBadgeKey ?? null,
    author_favorite_format_id: fx?.favoriteFormatId ?? null,
    author_favorite_archetype_id: fx?.favoriteArchetypeId ?? null,
    author_favorite_deck_name: fx?.favoriteDeckName ?? null,
    author_top_play_badge_key: fx?.topPlayBadgeKey ?? null,
    author_secondary_play_flair_key: fx?.secondaryPlayFlairKey ?? null,
    author_value_identity_summary: fx?.valueIdentitySummary ?? null,
    author_rarity_profile_label: fx?.rarityProfileLabel ?? null,
    author_top_value_badge_key: fx?.topValueBadgeKey ?? null,
    author_grail_highlight_summary: fx?.grailHighlightSummary ?? null,
    author_favorite_set_id: fx?.favoriteSetId ?? null,
    author_favorite_era_id: fx?.favoriteEraId ?? null,
    author_favorite_artist_id: fx?.favoriteArtistId ?? null,
    author_favorite_character_id: fx?.favoriteCharacterId ?? null,
    author_favorite_theme_id: fx?.favoriteThemeId ?? null,
    author_top_fandom_badge_key: fx?.topFandomBadgeKey ?? null,
    author_fandom_summary: fx?.fandomSummary ?? null,
    author_persona_text: fx?.personaText ?? null,
    author_clubs_summary: fx?.clubsSummary ?? null,
    author_reputation_summary: fx?.reputationSummary ?? null,
    author_influence_summary: fx?.influenceSummary ?? null,
    author_presence: presenceSnapshotFromFlair(fx),
    like_count: likeCount[p.id] ?? 0,
    comment_count: commentCount[p.id] ?? 0,
    liked_by_viewer: likedByMe.has(p.id),
    reaction_counts: reactionCounts[p.id] ?? {},
    viewer_reactions: viewerReactionsByPost[p.id] ?? [],
  };
  });

  return NextResponse.json({ posts: enriched });
}

async function POST_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { body?: string } = {};
  try {
    body = (await request.json()) as { body?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }
  if (text.length > MAX_BODY) {
    return NextResponse.json({ error: `body too long (max ${MAX_BODY})` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("community_posts")
    .insert({ author_id: user.id, body: text })
    .select("id, body, created_at, updated_at, author_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  mcaLog.event("community.post", { postId: data.id, len: text.length }, CTX);
  return NextResponse.json({ post: data });
}

export const GET = defineRouteSimple("GET /api/community/posts", GET_handler);
export const POST = defineRouteSimple("POST /api/community/posts", POST_handler);
