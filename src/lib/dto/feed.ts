import type { FeedItemDTO } from "@/lib/dto/catalog";
import type { SocialPresenceSnapshot } from "@/lib/social/types";

/**
 * GET `/api/feed` and `/api/profile/[id]/feed` row after hydration — extends {@link FeedItemDTO}
 * with actor/presence UI fields merged in route handlers.
 */
export type FeedHydratedItemDTO = FeedItemDTO & {
  actor_name?: string | null;
  actor_tier_slug?: string | null;
  actor_top_scan_milestone?: string | null;
  actor_reputation_score?: number;
  actor_reputation_summary?: string | null;
  actor_influence_summary?: string | null;
  actor_badge_highlight?: string | null;
  actor_activity_streak?: number;
  actor_top_flair_key?: string | null;
  actor_top_seasonal_flair_key?: string | null;
  actor_top_seasonal_badge_key?: string | null;
  actor_seasonal_badge_keys?: string[];
  actor_top_journey_badge_key?: string | null;
  actor_journey_progress_summary?: string | null;
  actor_top_collection_mastery_badge_key?: string | null;
  actor_collection_mastery_summary?: string | null;
  actor_trade_reputation_score_summary?: string | null;
  actor_top_trade_badge_key?: string | null;
  actor_favorite_format_id?: string | null;
  actor_favorite_archetype_id?: string | null;
  actor_favorite_deck_name?: string | null;
  actor_top_play_badge_key?: string | null;
  actor_secondary_play_flair_key?: string | null;
  actor_value_identity_summary?: string | null;
  actor_rarity_profile_label?: string | null;
  actor_top_value_badge_key?: string | null;
  actor_grail_highlight_summary?: string | null;
  actor_top_fandom_badge_key?: string | null;
  actor_fandom_summary?: string | null;
  actor_persona_text?: string | null;
  actor_persona_v2_label?: string | null;
  actor_persona_v2_summary?: string | null;
  actor_identity_headline?: string | null;
  actor_identity_summary?: string | null;
  actor_week_activity_count?: number;
  actor_season_highlight?: string | null;
  actor_clubs_summary?: string | null;
  actor_presence_label?: string | null;
  actor_presence?: SocialPresenceSnapshot | null;
  actor_social_graph_echo?: string | null;
  feed_v3_signal_line?: string | null;
};

/** Semantic alias for feed rows (same shape as {@link FeedHydratedItemDTO}). */
export type FeedEventDTO = FeedHydratedItemDTO;

/** JSON body for GET `/api/feed` and profile feed routes (`items` list). */
export type FeedPageDTO = {
  items: FeedHydratedItemDTO[];
  success?: boolean;
  context_id?: string;
};

/** POST/DELETE `/api/feed/save` success envelope. */
export type FeedSaveMutationDTO = {
  success?: boolean;
  context_id?: string;
  ok?: boolean;
};

/** Narrow union for feed POST responses. */
export type FeedMutationResponseDTO = FeedSaveMutationDTO | Record<string, unknown>;
