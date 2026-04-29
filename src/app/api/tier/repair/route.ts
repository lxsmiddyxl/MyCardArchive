import { getUserTier } from "@/lib/tier/check-limits";
import { ensureUserTier } from "@/lib/tier/ensure-tier";
import { createClient } from "@/lib/supabase/server";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

/**
 * GET /api/tier/repair — ensures a user_tiers row exists and returns it.
 */
async function GET_handler() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureUserTier(supabase);
  const tier = await getUserTier(supabase);

  if (!tier) {
    return NextResponse.json(
      { error: "Could not load or create user_tiers row", user_id: user.id },
      { status: 500 }
    );
  }

  return NextResponse.json({
    user_id: user.id,
    user_tiers: {
      user_id: user.id,
      tier_slug: tier.tier_slug,
      binder_limit: tier.binder_limit,
      card_limit: tier.card_limit,
      scan_limit: tier.scan_limit,
    },
    tier,
  });
}

export const GET = defineRouteNoArgs("GET /api/tier/repair", GET_handler);
