import type { SocialPresenceSnapshot } from "@/lib/social/types";

/** `GET /api/community/posts` post row (server + client). */
export type CommunityFeedPostDTO = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author_display: string;
  author_avatar_url: string | null;
  author_tier_slug?: string | null;
  author_top_scan_milestone?: string | null;
  author_reputation_score?: number;
  author_activity_streak?: number;
  author_top_flair_key?: string | null;
  author_top_seasonal_flair_key?: string | null;
  author_top_seasonal_badge_key?: string | null;
  author_seasonal_badge_keys?: string[];
  author_top_journey_badge_key?: string | null;
  author_journey_progress_summary?: string | null;
  author_top_collection_mastery_badge_key?: string | null;
  author_collection_mastery_summary?: string | null;
  author_trade_reputation_score_summary?: string | null;
  author_top_trade_badge_key?: string | null;
  author_favorite_format_id?: string | null;
  author_favorite_archetype_id?: string | null;
  author_favorite_deck_name?: string | null;
  author_top_play_badge_key?: string | null;
  author_secondary_play_flair_key?: string | null;
  author_value_identity_summary?: string | null;
  author_rarity_profile_label?: string | null;
  author_top_value_badge_key?: string | null;
  author_grail_highlight_summary?: string | null;
  author_top_fandom_badge_key?: string | null;
  author_fandom_summary?: string | null;
  author_persona_text?: string | null;
  author_persona_v2_label?: string | null;
  author_persona_v2_summary?: string | null;
  author_identity_headline?: string | null;
  author_identity_summary?: string | null;
  author_clubs_summary?: string | null;
  author_reputation_summary?: string | null;
  author_influence_summary?: string | null;
  author_badge_highlight?: string | null;
  author_presence_label?: string | null;
  author_presence?: SocialPresenceSnapshot;
  like_count: number;
  comment_count: number;
  liked_by_viewer: boolean;
  reaction_counts?: Record<string, number>;
  viewer_reactions?: string[];
};

/** Comment row from `/api/community/posts/[id]/comments`. */
export type CommunityCommentDTO = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author_display: string;
  author_avatar_url: string | null;
  author_tier_slug?: string | null;
  author_top_scan_milestone?: string | null;
  author_reputation_score?: number;
  author_activity_streak?: number;
  author_top_flair_key?: string | null;
  author_top_seasonal_flair_key?: string | null;
  author_top_seasonal_badge_key?: string | null;
  author_seasonal_badge_keys?: string[];
  author_top_journey_badge_key?: string | null;
  author_journey_progress_summary?: string | null;
  author_top_collection_mastery_badge_key?: string | null;
  author_collection_mastery_summary?: string | null;
  author_trade_reputation_score_summary?: string | null;
  author_top_trade_badge_key?: string | null;
  author_favorite_format_id?: string | null;
  author_favorite_archetype_id?: string | null;
  author_favorite_deck_name?: string | null;
  author_top_play_badge_key?: string | null;
  author_secondary_play_flair_key?: string | null;
  author_value_identity_summary?: string | null;
  author_rarity_profile_label?: string | null;
  author_top_value_badge_key?: string | null;
  author_grail_highlight_summary?: string | null;
  author_top_fandom_badge_key?: string | null;
  author_fandom_summary?: string | null;
  author_persona_text?: string | null;
  author_persona_v2_label?: string | null;
  author_persona_v2_summary?: string | null;
  author_identity_headline?: string | null;
  author_identity_summary?: string | null;
  author_clubs_summary?: string | null;
  author_reputation_summary?: string | null;
  author_influence_summary?: string | null;
  author_badge_highlight?: string | null;
  author_presence_label?: string | null;
  author_presence?: SocialPresenceSnapshot;
  parent_comment_id?: string | null;
  hidden?: boolean;
};

/** Enriched community post for feed UI (`catalog.CommunityPostDTO` is the minimal API row). */
export type CommunityPostDTO = CommunityFeedPostDTO;

/** `GET /api/community/posts` JSON body (posts array only). */
export type CommunityFeedPageDTO = {
  posts: CommunityFeedPostDTO[];
};

/** `POST /api/community/posts/[postId]/like` — merged toggle response. */
export type CommunityLikeMutationDTO = {
  liked: boolean;
};

/** `POST /api/community/posts/[postId]/reactions` — toggle active state. */
export type CommunityReactionMutationDTO = {
  active: boolean;
};

/** `POST /api/community/posts/[postId]/comments` — inserted row (minimal until GET enrich). */
export type CommunityCommentCreateBodyDTO = Pick<
  CommunityCommentDTO,
  "id" | "body" | "created_at" | "author_id" | "parent_comment_id"
> & {
  hidden?: boolean;
};

/** Narrow mutation payloads returned by community POST endpoints (subset union). */
export type CommunityMutationResponseDTO =
  | CommunityLikeMutationDTO
  | CommunityReactionMutationDTO
  | { ok?: boolean }
  | Record<string, unknown>;
