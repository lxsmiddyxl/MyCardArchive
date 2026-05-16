import {
  buildStructuredOfferSummary,
  normalizeStructuredItems,
  structuredPayloadNonEmpty,
} from "@/lib/market/structured-offer";
import { mapRowToMarketplaceV3OfferDTO } from "@/lib/marketplace/v3-offer-lifecycle";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { rateLimitedResponse } from "@/lib/server/rate-limit-api";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/market/v3/offers/create", surfaceName: "marketplace" } as const;
const MAX_BODY = 8000;

export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const blocked = rateLimitedResponse(request, "market-v3-offer-mut", {
    max: 48,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    to_user_id?: string;
    catalog_card_id?: string | null;
    body?: string;
    items_offered?: unknown;
    items_requested?: unknown;
    offer_notes?: string | null;
    expires_at?: string | null;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const toUserId = body.to_user_id?.trim();
  let text = typeof body.body === "string" ? body.body.trim() : "";
  const catalogCardId =
    typeof body.catalog_card_id === "string" && isUuidString(body.catalog_card_id)
      ? body.catalog_card_id
      : null;
  const itemsOffered = normalizeStructuredItems(body.items_offered);
  const itemsRequested = normalizeStructuredItems(body.items_requested);
  const offerNotes =
    typeof body.offer_notes === "string" && body.offer_notes.trim().length > 0
      ? body.offer_notes.trim()
      : null;

  if (!text && (itemsOffered.length > 0 || itemsRequested.length > 0 || offerNotes)) {
    text = buildStructuredOfferSummary(itemsOffered, itemsRequested, offerNotes);
  }

  if (!toUserId || !isUuidString(toUserId)) {
    return NextResponse.json({ error: "to_user_id required" }, { status: 400 });
  }
  if (toUserId === user.id) {
    return NextResponse.json({ error: "Cannot offer to yourself" }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "body or structured items required" }, { status: 400 });
  }
  if (text.length > MAX_BODY) {
    return NextResponse.json({ error: `body too long (max ${MAX_BODY})` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("market_offers")
    .insert({
      from_user_id: user.id,
      to_user_id: toUserId,
      catalog_card_id: catalogCardId,
      body: text,
      parent_offer_id: null,
      items_offered: itemsOffered,
      items_requested: itemsRequested,
      offer_notes: offerNotes,
    })
    .select(
      "id, thread_id, from_user_id, to_user_id, catalog_card_id, body, status, created_at, updated_at, items_offered, items_requested, offer_notes"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const offer = mapRowToMarketplaceV3OfferDTO(data);
  mcaLog.event("market.v3.offer.create", { offerId: offer.offerId, threadId: offer.threadId }, CTX);
  if (structuredPayloadNonEmpty(itemsOffered, itemsRequested)) {
    mcaLog.event("market.v3.offer.structured", { offerId: offer.offerId }, CTX);
  }
  return NextResponse.json({ offer });
}

export const POST = defineRouteSimple("POST /api/market/v3/offers/create", POST_handler);
