import { createClient } from "@/lib/supabase/server";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { isStripeConfigured } from "@/lib/stripe/server";
import { NextResponse } from "next/server";
import {
  getBinderCount,
  getCardCount,
  getScanCountThisMonth,
  getUserTier,
  isUnlimitedScans,
  remainingScansThisMonth,
} from "@/lib/tier/check-limits";

async function GET_handler() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [tier, binderCount, cardCount, scanCount] = await Promise.all([
    getUserTier(supabase),
    getBinderCount(supabase),
    getCardCount(supabase),
    getScanCountThisMonth(supabase),
  ]);

  const atBinderLimit =
    tier != null &&
    tier.binder_limit > 0 &&
    binderCount >= tier.binder_limit;
  const atCardLimit =
    tier != null &&
    tier.card_limit > 0 &&
    cardCount >= tier.card_limit;
  const remainingScans =
    tier != null && !isUnlimitedScans(tier.scan_limit)
      ? remainingScansThisMonth(tier, scanCount)
      : null;
  const atScanLimit =
    tier != null &&
    !isUnlimitedScans(tier.scan_limit) &&
    remainingScans !== null &&
    remainingScans <= 0;

  return NextResponse.json({
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
