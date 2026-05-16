import {
  checkRateLimit,
  type RateLimitOptions,
} from "@/lib/server/rate-limit";
import { rateLimitedResponse, RATE_LIMITS } from "@/lib/server/rate-limit-api";
import type { NextRequest } from "next/server";

export { RATE_LIMITS, rateLimitedResponse };

/** Phase 3 — finer-grained buckets for profile, onboarding, binder social. */
export const MCA_RATE_LIMITS = {
  ...RATE_LIMITS,
  profileMutation: { max: 24, windowMs: 60_000 },
  onboardingMutation: { max: 40, windowMs: 60_000 },
  binderCommentMutation: { max: 36, windowMs: 60_000 },
  binderReactionMutation: { max: 72, windowMs: 60_000 },
} as const;

export function applyRateLimit(
  request: NextRequest | Request,
  bucketSuffix: string,
  opts: RateLimitOptions
): Response | null {
  return rateLimitedResponse(request, bucketSuffix, opts);
}

export function isWithinRateLimit(key: string, opts: RateLimitOptions): boolean {
  return checkRateLimit(key, opts);
}
