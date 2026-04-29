import {
  buildStructuredOfferSummary,
  normalizeStructuredItems,
} from "@/lib/market/structured-offer";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/market/offers/revise", surfaceName: "marketplace" } as const;

export const dynamic = "force-dynamic";

const MAX_BODY = 8000;

async function POST_handler(request: Request, context: { params: Record<string, string> }) {
  const offerId = context.params.offerId?.trim();
  if (!offerId || !isUuidString(offerId)) {
    return NextResponse.json({ error: "Invalid offer id" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    body?: string;
    items_offered?: unknown;
    items_requested?: unknown;
    offer_notes?: string | null;
    expires_at?: string | null;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { data: row, error: fetchErr } = await supabase
    .from("market_offers")
    .select("id, thread_id, from_user_id, to_user_id, status, catalog_card_id, body, items_offered, items_requested, offer_notes, expires_at")
    .eq("id", offerId)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (row.status !== "pending") {
    return NextResponse.json({ error: "Only pending offers can be revised" }, { status: 409 });
  }
  if (row.from_user_id !== user.id) {
    return NextResponse.json({ error: "Only the sender can revise" }, { status: 403 });
  }

  const itemsOffered =
    body.items_offered !== undefined
      ? normalizeStructuredItems(body.items_offered)
      : normalizeStructuredItems(row.items_offered);
  const itemsRequested =
    body.items_requested !== undefined
      ? normalizeStructuredItems(body.items_requested)
      : normalizeStructuredItems(row.items_requested);

  let offerNotes: string | null =
    body.offer_notes !== undefined
      ? typeof body.offer_notes === "string" && body.offer_notes.trim().length > 0
        ? body.offer_notes.trim()
        : null
      : row.offer_notes;

  let expiresAt: string | null = row.expires_at;
  if (body.expires_at !== undefined) {
    if (typeof body.expires_at === "string" && body.expires_at.trim().length > 0) {
      const d = new Date(body.expires_at);
      if (!Number.isNaN(d.getTime()) && d.getTime() > Date.now()) {
        expiresAt = d.toISOString();
      }
    } else {
      expiresAt = null;
    }
  }

  let text =
    typeof body.body === "string"
      ? body.body.trim()
      : row.body;
  if (!text && (itemsOffered.length > 0 || itemsRequested.length > 0 || offerNotes)) {
    text = buildStructuredOfferSummary(itemsOffered, itemsRequested, offerNotes);
  }
  if (!text) {
    return NextResponse.json({ error: "body or structured content required" }, { status: 400 });
  }
  if (text.length > MAX_BODY) {
    return NextResponse.json({ error: `body too long (max ${MAX_BODY})` }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    body: text,
    items_offered: itemsOffered,
    items_requested: itemsRequested,
    offer_notes: offerNotes,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error: upErr } = await supabase
    .from("market_offers")
    .update(patch)
    .eq("id", offerId)
    .select()
    .maybeSingle();

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  mcaLog.event(
    "market.trade_room.revise",
    { offerId, threadId: row.thread_id, viewerId: user.id },
    CTX
  );

  return NextResponse.json({ offer: updated });
}

export const POST = defineRoute("POST /api/market/offers/[offerId]/revise", POST_handler);
