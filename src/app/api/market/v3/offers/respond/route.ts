import {
  buildStructuredOfferSummary,
  structuredPayloadNonEmpty,
} from "@/lib/market/structured-offer";
import { mapRowToMarketplaceV3OfferDTO, validateRespondPayload } from "@/lib/marketplace/v3-offer-lifecycle";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { rateLimitedResponse } from "@/lib/server/rate-limit-api";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/market/v3/offers/respond", surfaceName: "marketplace" } as const;
const MAX_BODY = 8000;

export const dynamic = "force-dynamic";

async function PATCH_handler(request: Request) {
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

  let raw: Record<string, unknown> = {};
  try {
    raw = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = validateRespondPayload({
    offerId: typeof raw.offerId === "string" ? raw.offerId : undefined,
    action: typeof raw.action === "string" ? raw.action : undefined,
    items_offered: raw.items_offered,
    items_requested: raw.items_requested,
    counter_body: typeof raw.counter_body === "string" ? raw.counter_body : undefined,
  });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  if (!isUuidString(parsed.offerId)) {
    return NextResponse.json({ error: "Invalid offerId" }, { status: 400 });
  }

  const { data: parent, error: pErr } = await supabase
    .from("market_offers")
    .select("id, thread_id, from_user_id, to_user_id, status, catalog_card_id, body, items_offered, items_requested, offer_notes")
    .eq("id", parsed.offerId)
    .maybeSingle();

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  if (!parent) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  if (parent.status !== "pending") {
    return NextResponse.json({ error: "Offer is not pending" }, { status: 409 });
  }

  const isRecipient = parent.to_user_id === user.id;
  const isSender = parent.from_user_id === user.id;
  if (!isRecipient && !isSender) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (parsed.action === "decline") {
    if (!isRecipient && !isSender) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { data, error } = await supabase
      .from("market_offers")
      .update({ status: "declined" })
      .eq("id", parent.id)
      .select(
        "id, thread_id, from_user_id, to_user_id, body, status, created_at, updated_at, items_offered, items_requested, offer_notes"
      )
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    mcaLog.event("market.v3.offer.decline", { offerId: parent.id }, CTX);
    return NextResponse.json({ offer: mapRowToMarketplaceV3OfferDTO(data) });
  }

  if (parsed.action === "accept") {
    if (!isRecipient) {
      return NextResponse.json({ error: "Only the recipient can accept" }, { status: 403 });
    }
    const { data, error } = await supabase
      .from("market_offers")
      .update({ status: "accepted" })
      .eq("id", parent.id)
      .select(
        "id, thread_id, from_user_id, to_user_id, body, status, created_at, updated_at, items_offered, items_requested, offer_notes"
      )
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    mcaLog.event("market.v3.offer.accept", { offerId: parent.id }, CTX);
    return NextResponse.json({ offer: mapRowToMarketplaceV3OfferDTO(data) });
  }

  if (!isRecipient) {
    return NextResponse.json({ error: "Only the recipient can counter" }, { status: 403 });
  }

  let text = parsed.counterBody;
  if (!text) {
    text = buildStructuredOfferSummary(parsed.itemsOffered, parsed.itemsRequested, null);
  }
  if (text.length > MAX_BODY) {
    return NextResponse.json({ error: `body too long (max ${MAX_BODY})` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("market_offers")
    .insert({
      from_user_id: user.id,
      to_user_id: parent.from_user_id,
      catalog_card_id: parent.catalog_card_id,
      body: text,
      parent_offer_id: parent.id,
      thread_id: parent.thread_id,
      items_offered: parsed.itemsOffered,
      items_requested: parsed.itemsRequested,
    })
    .select(
      "id, thread_id, from_user_id, to_user_id, body, status, created_at, updated_at, items_offered, items_requested, offer_notes"
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  mcaLog.event(
    "market.v3.offer.counter",
    { offerId: data.id, parentId: parent.id, structured: structuredPayloadNonEmpty(parsed.itemsOffered, parsed.itemsRequested) },
    CTX
  );
  return NextResponse.json({ offer: mapRowToMarketplaceV3OfferDTO(data) });
}

export const PATCH = defineRouteSimple("PATCH /api/market/v3/offers/respond", PATCH_handler);
