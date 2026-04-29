import {
  buildStructuredOfferSummary,
  normalizeStructuredItems,
  structuredPayloadNonEmpty,
} from "@/lib/market/structured-offer";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/market/offers/counter", surfaceName: "marketplace" } as const;

export const dynamic = "force-dynamic";

const MAX_BODY = 8000;

async function POST_handler(
  request: Request,
  context: { params: Record<string, string> }
) {
  const parentId = context.params.offerId?.trim();
  if (!parentId || !isUuidString(parentId)) {
    return NextResponse.json({ error: "Invalid offer id" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
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

  const { data: parent, error: pErr } = await supabase
    .from("market_offers")
    .select("id, thread_id, from_user_id, to_user_id, status, catalog_card_id")
    .eq("id", parentId)
    .maybeSingle();

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }
  if (!parent) {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }
  if (parent.status !== "pending") {
    return NextResponse.json({ error: "Offer is not pending" }, { status: 409 });
  }
  if (parent.to_user_id !== user.id) {
    return NextResponse.json({ error: "Only the recipient can counter" }, { status: 403 });
  }

  const itemsOffered = normalizeStructuredItems(body.items_offered);
  const itemsRequested = normalizeStructuredItems(body.items_requested);

  const offerNotes =
    typeof body.offer_notes === "string" && body.offer_notes.trim().length > 0
      ? body.offer_notes.trim()
      : null;

  let expiresAt: string | null = null;
  if (typeof body.expires_at === "string" && body.expires_at.trim().length > 0) {
    const d = new Date(body.expires_at);
    if (!Number.isNaN(d.getTime()) && d.getTime() > Date.now()) {
      expiresAt = d.toISOString();
    }
  }

  let text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text && (itemsOffered.length > 0 || itemsRequested.length > 0 || offerNotes)) {
    text = buildStructuredOfferSummary(itemsOffered, itemsRequested, offerNotes);
  }
  if (!text) {
    return NextResponse.json({ error: "body or structured items required" }, { status: 400 });
  }
  if (text.length > MAX_BODY) {
    return NextResponse.json({ error: `body too long (max ${MAX_BODY})` }, { status: 400 });
  }

  const structured =
    structuredPayloadNonEmpty(itemsOffered, itemsRequested) || Boolean(offerNotes) || Boolean(expiresAt);

  const { data, error } = await supabase
    .from("market_offers")
    .insert({
      from_user_id: user.id,
      to_user_id: parent.from_user_id,
      body: text,
      parent_offer_id: parentId,
      catalog_card_id: parent.catalog_card_id,
      items_offered: itemsOffered,
      items_requested: itemsRequested,
      offer_notes: offerNotes,
      expires_at: expiresAt,
    })
    .select(
      "id, thread_id, parent_offer_id, from_user_id, to_user_id, catalog_card_id, body, status, created_at, items_offered, items_requested, offer_notes, expires_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  mcaLog.event(
    "market.offer.counter",
    { offerId: data.id, parentOfferId: parentId, threadId: data.thread_id },
    CTX
  );
  if (structured) {
    mcaLog.event(
      "market.offer.structured",
      {
        offerId: data.id,
        offeredCount: itemsOffered.length,
        requestedCount: itemsRequested.length,
        hasNotes: Boolean(offerNotes),
        hasExpiry: Boolean(expiresAt),
        kind: "counter",
      },
      CTX
    );
  }
  return NextResponse.json({ offer: data });
}

export const POST = defineRoute("POST /api/market/offers/[offerId]/counter", POST_handler);
