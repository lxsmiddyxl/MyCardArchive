import {
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/server";
import { isStripeConfigured } from "@/lib/stripe/server";
import {
  getBinderCount,
  getCardCount,
  getEffectiveUserTier,
  getScanCountThisMonth,
  isUnlimitedScans,
  remainingScansThisMonth,
} from "@/lib/tier/check-limits";

async function GET_handler() {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const [tier, binderCount, cardCount, scanCount] = await Promise.all([
    getEffectiveUserTier(supabase),
    getBinderCount(supabase),
    getCardCount(supabase),
    getScanCountThisMonth(supabase),
  ]);

  const atBinderLimit =
    tier != null && tier.binder_limit > 0 && binderCount >= tier.binder_limit;
  const atCardLimit =
    tier != null && tier.card_limit > 0 && cardCount >= tier.card_limit;
  const remainingScans =
    tier != null && !isUnlimitedScans(tier.scan_limit)
      ? remainingScansThisMonth(tier, scanCount)
      : null;
  const atScanLimit =
    tier != null &&
    !isUnlimitedScans(tier.scan_limit) &&
    remainingScans !== null &&
    remainingScans <= 0;

  return successJson(ctx, {
    tier,
    binder_count: binderCount,
    card_count: cardCount,
    scan_count_this_month: scanCount,
    scans_remaining_this_month: remainingScans,
    at_binder_limit: atBinderLimit,
    at_card_limit: atCardLimit,
    at_scan_limit: atScanLimit,
    stripe_checkout_available: isStripeConfigured(),
  });
}

export const GET = defineRouteNoArgs("GET /api/tier/status", GET_handler);
