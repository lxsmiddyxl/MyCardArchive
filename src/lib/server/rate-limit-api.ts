import {
  checkRateLimit,
  getRateLimitBucketStats,
  rateLimitHeaders,
  type RateLimitOptions,
} from "@/lib/server/rate-limit";
import { NextResponse } from "next/server";

function clientKey(request: Request): string {
  const h = request.headers;
  const fwd = h.get("x-forwarded-for");
  const ip =
    (fwd?.split(",")[0]?.trim() ?? "") ||
    h.get("x-real-ip")?.trim() ||
    "unknown";
  return ip;
}

export function rateLimitedResponse(
  request: Request,
  bucketSuffix: string,
  opts: RateLimitOptions
): Response | null {
  const key = `${bucketSuffix}:${clientKey(request)}`;
  if (checkRateLimit(key, opts)) return null;
  const now = Date.now();
  const resetAt = now + opts.windowMs;
  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: rateLimitHeaders(resetAt),
    }
  );
}

/** Presets for Phase 7C */
export const RATE_LIMITS = {
  cardsSearch: { max: 120, windowMs: 60_000 },
  /** POST/PATCH/DELETE on `/api/cards` (excluding search facet traffic). */
  cardsMutation: { max: 90, windowMs: 60_000 },
  deckMutation: { max: 90, windowMs: 60_000 },
  binderMutation: { max: 90, windowMs: 60_000 },
  /** Trade actions, messages, line items. */
  tradesMutation: { max: 120, windowMs: 60_000 },
  /** POST `/api/scan` — vision + auto-match (expensive). */
  scanMutation: { max: 40, windowMs: 60_000 },
  /** GET `/api/matching/*` — index reads (abuse protection). */
  matchingReads: { max: 180, windowMs: 60_000 },
  /** POST `/api/log` — client telemetry envelopes. */
  logIngest: { max: 400, windowMs: 60_000 },
  /** POST `/api/billing/*` — checkout sessions, portal (fraud / abuse). */
  billingMutation: { max: 30, windowMs: 60_000 },
  publicDeckView: { max: 240, windowMs: 60_000 },
  /** POST `/api/community/posts` — spam / flood protection. */
  communityPostMutation: { max: 36, windowMs: 60_000 },
  /** GET `/api/community/feed/v1` — read-only feed polling. */
  communityFeedRead: { max: 120, windowMs: 60_000 },
  /** POST `/api/community/posts/report` — abuse protection. */
  communityReportMutation: { max: 24, windowMs: 60_000 },
  /** GET `/api/market/v3/discover/*` — discovery polling (Phase 71). */
  marketV3DiscoverRead: { max: 90, windowMs: 60_000 },
  /** POST/PATCH `/api/market/v3/offers/*` — offer negotiation (Phase 81). */
  marketV3OfferMutation: { max: 48, windowMs: 60_000 },
  /** POST `/api/community/posts/react` — reaction toggles (Phase 86). */
  communityReactMutation: { max: 60, windowMs: 60_000 },
  /** POST profile / users profile updates (Launch Prep Phase 3). */
  profileMutation: { max: 24, windowMs: 60_000 },
  /** POST onboarding steps (Launch Prep Phase 3). */
  onboardingMutation: { max: 40, windowMs: 60_000 },
  /** POST binder comments (Launch Prep Phase 3). */
  binderCommentMutation: { max: 36, windowMs: 60_000 },
  /** POST binder reactions (Launch Prep Phase 3). */
  binderReactionMutation: { max: 72, windowMs: 60_000 },
} as const;

/** In-memory snapshot for `/api/health/rate-limits` (suffixes match middleware buckets). */
export function getRateLimitHealthBuckets(): Record<
  string,
  { used: number; limit: number }
> {
  return getRateLimitBucketStats([
    { suffix: "cards-search", max: RATE_LIMITS.cardsSearch.max },
    { suffix: "cards-mut", max: RATE_LIMITS.cardsMutation.max },
    { suffix: "deck-mut", max: RATE_LIMITS.deckMutation.max },
    { suffix: "binder-mut", max: RATE_LIMITS.binderMutation.max },
    { suffix: "trades-mut", max: RATE_LIMITS.tradesMutation.max },
    { suffix: "scan-mut", max: RATE_LIMITS.scanMutation.max },
    { suffix: "matching-read", max: RATE_LIMITS.matchingReads.max },
    { suffix: "log-ingest", max: RATE_LIMITS.logIngest.max },
    { suffix: "billing-mut", max: RATE_LIMITS.billingMutation.max },
    { suffix: "pub-deck-view", max: RATE_LIMITS.publicDeckView.max },
    { suffix: "community-post-mut", max: RATE_LIMITS.communityPostMutation.max },
    { suffix: "community-feed-read", max: RATE_LIMITS.communityFeedRead.max },
    { suffix: "community-report-mut", max: RATE_LIMITS.communityReportMutation.max },
    { suffix: "market-v3-discover-read", max: RATE_LIMITS.marketV3DiscoverRead.max },
    { suffix: "profile-mut", max: RATE_LIMITS.profileMutation.max },
    { suffix: "onboarding-mut", max: RATE_LIMITS.onboardingMutation.max },
    { suffix: "binder-comment", max: RATE_LIMITS.binderCommentMutation.max },
    { suffix: "binder-reaction", max: RATE_LIMITS.binderReactionMutation.max },
  ]);
}
