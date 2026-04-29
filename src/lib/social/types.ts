/** Client + API shapes for the social layer (Phase 52+). */

import type { UserBadgeRow } from "@/lib/badges/types";

/** Serializable presence (`user_presence` via RPC) — UI rounds relative times client-side. */
export type SocialPresenceSnapshot = {
  optedOut: boolean;
  lastSeenAt: string | null;
  lastActivityAt: string | null;
  lastActivityKey: string | null;
};
import type { CollectionMasteryProfileRow } from "@/lib/collection/collection-mastery-merge";
import type { JourneyProfileRow } from "@/lib/journeys/journey-catalog";
import type { TradeReputationCounts } from "@/lib/trade/trade-reputation-helpers";
import type { FandomIdentityFields } from "@/lib/fandom/fandom-identity-helpers";
import type { CollectionValueCacheRow } from "@/lib/value/value-identity-helpers";
import type { SeasonId } from "@/lib/seasons/season-catalog";
import type { SeasonSummaryJsonV1, YearInReviewJsonV1 } from "@/lib/seasons/summary-types";
import type { ClubChip } from "@/lib/clubs/club-catalog";
import type { ReputationDimensionId } from "@/lib/reputation/reputation-catalog";
import type { ReputationScores } from "@/lib/reputation/reputation-summary";
import type { InfluenceDimensionId } from "@/lib/influence/influence-catalog";
import type { InfluenceScores } from "@/lib/influence/influence-summary";

export type PlayIdentityPayload = {
  favoriteFormatId: string | null;
  favoriteArchetypeId: string | null;
  favoriteDeckName: string | null;
  updatedAt?: string | null;
};

export type PlayTopDeckStat = {
  deckId: string;
  deckName: string;
  totalCards: number;
  uniqueCards: number;
  lastUpdated: string;
};

export type GrailCardPayload = {
  cardId: string;
  cardName: string;
  note: string | null;
  addedAt: string;
};

/** Saved fandom anchors — aligned with RPC `get_user_fandom_identity`. */
export type FandomIdentityPayload = FandomIdentityFields;

/** Heuristic aggregates from inventory — informational only (`suggest_user_fandom_identity`). */
export type FandomSuggestionsPayload = {
  suggestedSetId: string | null;
  suggestedEraId: string | null;
  suggestedArtistId: string | null;
  suggestedCharacterId: string | null;
  suggestedThemeId: string | null;
};

export type CollectionStats = {
  cardCount: number;
  binderCount: number;
  deckCount: number;
  tradeCount: number;
};

/** UTC calendar-year heatmap from `get_user_activity_heatmap` (length = days in year). */
export type ActivityHeatmapPayload = {
  year: number;
  counts: number[];
};

/** Milestone row from `get_user_timeline_events` (date-level only — no exact timestamps). */
export type TimelineEventPayload = {
  date: string;
  type: string;
  label: string;
  icon: string;
  metadata?: Record<string, unknown>;
};

/** `stub` — placeholder when the user id is unknown; `public` — cross-user projection read. */
export type SocialReputationBlock = {
  summary: string | null;
  topDimension: ReputationDimensionId | null;
  /** Radar vertices 0–100 — show as shape only, not printed scores. */
  radar: ReputationScores;
  recentEvents: { label: string; occurredOn: string }[];
};

export type SocialInfluenceBlock = {
  summary: string | null;
  topDimension: InfluenceDimensionId | null;
  /** Radar vertices 0–100 — shape only, never shown as leaderboard numbers. */
  radar: InfluenceScores;
  recentEvents: { label: string; occurredOn: string }[];
};

export type SocialProfileVisibility = "self" | "public" | "stub";

export type SocialProfilePayload = {
  userId: string;
  username: string | null;
  /** Public display name (preferred for feed / community). */
  displayName?: string | null;
  /** Unique lowercase handle without @. */
  handle?: string | null;
  avatarUrl: string | null;
  /** Only present for `visibility === "self"` (own session). */
  email?: string | null;
  /** Public bio (from `social_public_profiles`). */
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  /** Public favorite sets (from `social_public_profiles`). */
  favoriteSets?: string[];
  stats: CollectionStats;
  visibility: SocialProfileVisibility;
  /** Set when `visibility === "stub"` or profile is missing. */
  stubReason?: string | null;
  /** True when subject user does not exist in the system. */
  notFound?: boolean;
  /** Follow graph (authenticated viewers). */
  followerCount?: number;
  followingCount?: number;
  /** Whether the current viewer follows this profile subject (false if self or unauthenticated). */
  viewerFollowsTarget?: boolean;
  /** Profile flair (trainer card / set / accent). */
  favoriteCard?: string | null;
  favoriteSet?: string | null;
  favoriteColor?: string | null;
  /** When the account joined (ISO string). */
  joinedAt?: string | null;
  /** Denormalized plan slug for public emblem (`free` | `pro` | `elite`); null if unknown. */
  tierSlug?: string | null;
  /** One-line synthesized persona (`user_persona_cache` / `refresh_user_persona`). */
  personaText?: string | null;
  /** Last-seen + coarse activity (rounded in UI — ISO strings for client derivation only). */
  presence?: SocialPresenceSnapshot | null;
  /** Earned badges (tier, tenure, scan milestones) from `user_badges`. */
  badges?: UserBadgeRow[];
  /** Cached reputation score (posts, comments, likes received, scans). */
  reputationScore?: number;
  /** UTC calendar-day activity streak length. */
  activityStreak?: number;
  /** Earned social flair keys (subset of `flair-meta`). */
  earnedFlairKeys?: string[];
  /** Activity hero stats (RPC-backed for any profile subject). */
  activityCounts?: {
    communityPosts: number;
    scans: number;
    achievements: number;
    trades: number;
  };
  /** Collector journeys (catalog + server progress). */
  journeys?: JourneyProfileRow[];
  activeJourneys?: JourneyProfileRow[];
  completedJourneys?: JourneyProfileRow[];
  /** Binder + set mastery tiers (server-backed `user_collection_mastery`). */
  collectionMastery?: CollectionMasteryProfileRow[];
  /** Aggregated peer trade feedback (RPC `get_user_trade_reputation`). */
  tradeReputation?: TradeReputationCounts | null;
  /** Favorite format / archetype / deck label (`user_play_identity`). */
  playIdentity?: PlayIdentityPayload | null;
  /** Top decks by card count (`get_user_top_deck_stats`) for suggestions. */
  playTopDecks?: PlayTopDeckStat[];
  /** Cached collection aggregates (`get_user_collection_value`) — approximate, not audited. */
  collectionValue?: CollectionValueCacheRow | null;
  grailCards?: GrailCardPayload[];
  /** Curated TCG taste pins (`user_fandom_identity`). */
  fandomIdentity?: FandomIdentityPayload | null;
  /** Server-only suggestions derived from binder contents — optional panel in profile UI. */
  fandomSuggestions?: FandomSuggestionsPayload | null;
  /** Top similar collectors (from `user_similarity_cache`), enriched for profile preview. */
  similarCollectors?: {
    userId: string;
    similarityScore: number;
    username: string | null;
    displayName: string | null;
    handle: string | null;
    avatarUrl: string | null;
    personaText: string | null;
    presence?: SocialPresenceSnapshot | null;
    /** Last 30 UTC days of aggregate activity counts (mini strip). */
    activityHeatmapStrip?: number[];
  }[];
  /** Current UTC year aggregate activity counts for GitHub-style heatmap. */
  activityHeatmap?: ActivityHeatmapPayload | null;
  /** Milestone timeline (last ~24 months from server). */
  timelineEvents?: TimelineEventPayload[];
  /** Last completed meteorological season recap (aggregates only). */
  lastSeasonSummary?: {
    seasonId: SeasonId;
    year: number;
    summary: SeasonSummaryJsonV1;
    generatedAt: string | null;
  } | null;
  /** Most recent generated year-in-review row, if any. */
  lastYearInReview?: {
    year: number;
    summary: YearInReviewJsonV1;
    generatedAt: string | null;
    viewedAt?: string | null;
  } | null;
  /** Auto-assigned cohort chips from `user_clubs`. */
  clubs?: ClubChip[];
  primaryClubId?: string | null;
  /** Multi-dimensional reputation graph + safe event labels (no raw logs). */
  reputation?: SocialReputationBlock | null;
  /** Multi-dimensional influence graph + safe event labels (no raw logs). */
  influence?: SocialInfluenceBlock | null;
};

/** @deprecated Prefer server-backed `social_public_profiles` via profile payload. */
export type SocialLocalProfileExtras = {
  bio: string;
  /** Display names or catalog set ids (free text). */
  favoriteSets: string[];
};

export const SOCIAL_LOCAL_PROFILE_KEY = "mca:social:local-profile:v1";
/** @deprecated Real follows use `user_follows` + API. */
export const SOCIAL_FOLLOWING_KEY = "mca:social:following:v1";
