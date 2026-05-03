import { errorJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { loadTopScanMilestonesByUserIds } from "@/lib/badges/load-top-scan-milestones";
import type { CommunityCommentDTO } from "@/lib/dto/community-feed";
import { enrichUsersWithFlair } from "@/lib/flair/enrich-user-flair-batch";
import { presenceSnapshotFromFlair } from "@/lib/presence/flair-presence-fields";
import { resolveAuthorFromSocial } from "@/lib/profile/resolveAuthor";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/community/posts/comments", surfaceName: "community" } as const;

export const dynamic = "force-dynamic";

const MAX_COMMENT = 4000;

async function GET_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  const ctx = withContextId();
  const postId = context.params.postId?.trim();
  if (!postId || !isUuidString(postId)) {
    return errorJson(ctx, "Invalid post id", 400);
  }

  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const { data: post } = await supabase.from("community_posts").select("id, author_id").eq("id", postId).maybeSingle();
  if (!post) {
    return errorJson(ctx, "Post not found", 404);
  }

  const { data: comments, error } = await supabase
    .from("community_post_comments")
    .select("id, body, created_at, author_id, parent_comment_id, hidden")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    return errorJson(ctx, error.message, 500);
  }

  const rows = (comments ?? []).filter((c) => {
    if (!c.hidden) return true;
    return c.author_id === session.userId || post.author_id === session.userId;
  });
  const authorIds = [...new Set(rows.map((c) => c.author_id))];
  const { data: profiles } = await supabase
    .from("social_public_profiles")
    .select("user_id, username, avatar_url, display_name, handle, tier_slug")
    .in("user_id", authorIds);

  const byUser: Record<
    string,
    {
      username: string | null;
      avatar_url: string | null;
      display_name: string | null;
      handle: string | null;
      tier_slug: string | null;
    }
  > = {};
  for (const p of profiles ?? []) {
    byUser[p.user_id] = {
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
    tierByAuthor[id] = byUser[id]?.tier_slug ?? null;
  }
  const flairByAuthor =
    authorIds.length > 0 ? await enrichUsersWithFlair(supabase, authorIds, tierByAuthor) : {};

  const enriched = rows.map((c) => {
    const fx = flairByAuthor[c.author_id];
    return {
    ...c,
    author_display: resolveAuthorFromSocial(byUser[c.author_id] ?? null),
    author_avatar_url: byUser[c.author_id]?.avatar_url ?? null,
    author_tier_slug: byUser[c.author_id]?.tier_slug ?? null,
    author_top_scan_milestone: milestones[c.author_id] ?? null,
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
  };
  });

  return NextResponse.json({
    success: true,
    context_id: ctx.contextId,
    comments: enriched as (CommunityCommentDTO & Record<string, unknown>)[],
  });
}

async function POST_handler(
  request: Request,
  context: { params: Record<string, string> }
) {
  const ctx = withContextId();
  const postId = context.params.postId?.trim();
  if (!postId || !isUuidString(postId)) {
    return errorJson(ctx, "Invalid post id", 400);
  }

  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  let body: { body?: string; parent_comment_id?: string | null } = {};
  try {
    body = (await request.json()) as { body?: string; parent_comment_id?: string | null };
  } catch {
    return errorJson(ctx, "Invalid JSON", 400);
  }

  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) {
    return errorJson(ctx, "body required", 400);
  }
  if (text.length > MAX_COMMENT) {
    return errorJson(ctx, `body too long (max ${MAX_COMMENT})`, 400);
  }

  const { data: post } = await supabase.from("community_posts").select("id").eq("id", postId).maybeSingle();
  if (!post) {
    return errorJson(ctx, "Post not found", 404);
  }

  let parentId: string | null = null;
  const rawParent = body.parent_comment_id;
  if (typeof rawParent === "string" && isUuidString(rawParent.trim())) {
    const pid = rawParent.trim();
    const { data: parentRow } = await supabase
      .from("community_post_comments")
      .select("id")
      .eq("id", pid)
      .eq("post_id", postId)
      .maybeSingle();
    if (!parentRow) {
      return errorJson(ctx, "Invalid parent comment", 400);
    }
    parentId = pid;
  }

  const { data, error } = await supabase
    .from("community_post_comments")
    .insert({ post_id: postId, author_id: session.userId, body: text, parent_comment_id: parentId })
    .select("id, body, created_at, author_id, parent_comment_id, hidden")
    .single();

  if (error) {
    return errorJson(ctx, error.message, 500);
  }

  mcaLog.event("community.comment", { postId, commentId: data.id, len: text.length }, CTX);
  if (parentId) {
    mcaLog.event("community.thread", { postId, commentId: data.id, parentCommentId: parentId }, CTX);
  }
  return NextResponse.json({ success: true, context_id: ctx.contextId, comment: data as CommunityCommentDTO });
}

export const GET = defineRoute("GET /api/community/posts/[postId]/comments", GET_handler);
export const POST = defineRoute("POST /api/community/posts/[postId]/comments", POST_handler);
