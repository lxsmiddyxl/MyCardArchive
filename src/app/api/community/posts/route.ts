import { errorJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { loadTopScanMilestonesByUserIds } from "@/lib/badges/load-top-scan-milestones";
import { moderationTokensViolated } from "@/lib/community/content-guard";
import { splitCommunityTopicBody, withCommunityTopicLine } from "@/lib/community/topic-line";
import type { CommunityPostDTO } from "@/lib/dto/catalog";
import { enrichUsersWithFlair } from "@/lib/flair/enrich-user-flair-batch";
import { presenceSnapshotFromFlair } from "@/lib/presence/flair-presence-fields";
import { resolveAuthorFromSocial } from "@/lib/profile/resolveAuthor";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { sanitizePlainTextUserInput } from "@/lib/server/sanitize-user-text";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/community/posts", surfaceName: "community" } as const;

export const dynamic = "force-dynamic";

const MAX_BODY = 8000;

async function GET_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const url = new URL(request.url);
  const limit = Math.min(40, Math.max(1, parseInt(url.searchParams.get("limit") ?? "24", 10)));
  const offset = Math.min(10_000, Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10)));
  const authorFilter = url.searchParams.get("author_id")?.trim();
  if (authorFilter && !isUuidString(authorFilter)) {
    return errorJson(ctx, "Invalid author_id", 400);
  }
  const topicFilter = url.searchParams.get("topic")?.trim().toLowerCase();

  let q = supabase.from("community_posts").select("id, body, created_at, updated_at, author_id");
  if (authorFilter) {
    q = q.eq("author_id", authorFilter);
  }
  if (topicFilter && /^[a-z0-9_-]{1,32}$/.test(topicFilter)) {
    q = q.like("body", `[mca:topic:${topicFilter}]%`);
  }
  const { data: posts, error } = await q
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return errorJson(ctx, error.message, 500);
  }

  const rows = posts ?? [];
  if (rows.length === 0) {
    return NextResponse.json({ success: true, context_id: ctx.contextId, posts: [] });
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
    if (row.user_id === session.userId) likedByMe.add(row.post_id);
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
    if (row.user_id === session.userId) {
      if (!viewerReactionsByPost[row.post_id]) viewerReactionsByPost[row.post_id] = [];
      viewerReactionsByPost[row.post_id]?.push(row.reaction);
    }
  }

  const enriched = rows.map((p) => {
    const fx = flairByAuthor[p.author_id];
    const split = splitCommunityTopicBody(String(p.body ?? ""));
    return {
    ...p,
    topic_slug: split.topic_slug,
    body_text: split.text,
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
    author_persona_v2_label: fx?.personaV2Label ?? null,
    author_persona_v2_summary: fx?.personaV2Summary ?? null,
    author_identity_headline: fx?.identityHeadline ?? null,
    author_identity_summary: fx?.identitySummary ?? null,
    author_clubs_summary: fx?.clubsSummary ?? null,
    author_reputation_summary: fx?.reputationSummary ?? null,
    author_influence_summary: fx?.influenceSummary ?? null,
    author_badge_highlight: fx?.badgeHighlight ?? null,
    author_presence_label: fx?.presenceLabel ?? null,
    author_presence: presenceSnapshotFromFlair(fx),
    like_count: likeCount[p.id] ?? 0,
    comment_count: commentCount[p.id] ?? 0,
    liked_by_viewer: likedByMe.has(p.id),
    reaction_counts: reactionCounts[p.id] ?? {},
    viewer_reactions: viewerReactionsByPost[p.id] ?? [],
  };
  });

  return NextResponse.json({
    success: true,
    context_id: ctx.contextId,
    posts: enriched as (CommunityPostDTO & Record<string, unknown>)[],
  });
}

async function POST_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  let body: { body?: string; topic_slug?: string | null } = {};
  try {
    body = (await request.json()) as { body?: string; topic_slug?: string | null };
  } catch {
    return errorJson(ctx, "Invalid JSON", 400);
  }

  const raw = typeof body.body === "string" ? body.body : "";
  const text = sanitizePlainTextUserInput(raw, MAX_BODY);
  if (!text) {
    return errorJson(ctx, "body required", 400);
  }

  if (moderationTokensViolated(text)) {
    return errorJson(ctx, "This content cannot be posted.", 422);
  }

  const topic = typeof body.topic_slug === "string" ? body.topic_slug : null;
  const stored = topic ? withCommunityTopicLine(topic, text) : text;

  const { data, error } = await supabase
    .from("community_posts")
    .insert({ author_id: session.userId, body: stored })
    .select("id, body, created_at, updated_at, author_id")
    .single();

  if (error) {
    return errorJson(ctx, error.message, 500);
  }

  mcaLog.event("community.post", { postId: data.id, len: text.length }, CTX);
  return NextResponse.json({ success: true, context_id: ctx.contextId, post: data as CommunityPostDTO });
}

export const GET = defineRouteSimple("GET /api/community/posts", GET_handler);
export const POST = defineRouteSimple("POST /api/community/posts", POST_handler);
