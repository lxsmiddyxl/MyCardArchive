import { errorJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import type { MarketplaceV3OfferHistoryEntryDTO } from "@/lib/dto/marketplace-v3-offers";
import { mapRowToMarketplaceV3OfferDTO, offerHistoryRole } from "@/lib/marketplace/v3-offer-lifecycle";
import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function GET_handler(_request: Request, context: { params: Record<string, string> }) {
  const ctx = withContextId();
  const profileId = context.params.id?.trim();
  if (!profileId || !isUuidString(profileId)) {
    return errorJson(ctx, "Invalid profile id", 400);
  }

  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const { data: rows, error } = await supabase
    .from("market_offers")
    .select(
      "id, thread_id, from_user_id, to_user_id, body, status, created_at, updated_at, items_offered, items_requested, offer_notes"
    )
    .or(`from_user_id.eq.${profileId},to_user_id.eq.${profileId}`)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    return errorJson(ctx, error.message, 500);
  }

  const history: MarketplaceV3OfferHistoryEntryDTO[] = [];
  for (const row of rows ?? []) {
    const offer = mapRowToMarketplaceV3OfferDTO(row);
    const role = offerHistoryRole(profileId, offer);
    if (!role) continue;
    const isParticipant = offer.fromUserId === session.userId || offer.toUserId === session.userId;
    if (!isParticipant && session.userId !== profileId) continue;
    history.push({ offer, role });
  }

  return NextResponse.json({ success: true, context_id: ctx.contextId, history });
}

export const GET = defineRoute("GET /api/profile/[id]/offer-history", GET_handler);
