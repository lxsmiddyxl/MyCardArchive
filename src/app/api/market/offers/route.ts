import {
  buildStructuredOfferSummary,
  normalizeStructuredItems,
  structuredPayloadNonEmpty,
} from "@/lib/market/structured-offer";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { logApiValidationFailure } from "@/lib/server/validation-telemetry";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/market/offers", surfaceName: "marketplace" } as const;

export const dynamic = "force-dynamic";

const MAX_BODY = 8000;

async function GET_handler() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: rows, error } = await supabase
    .from("market_offers")
    .select(
      "id, thread_id, parent_offer_id, from_user_id, to_user_id, catalog_card_id, body, status, created_at, updated_at, items_offered, items_requested, offer_notes, expires_at"
    )
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = rows ?? [];
  const byThread = new Map<
    string,
    {
      thread_id: string;
      offers: typeof list;
      last_at: string;
    }
  >();

  for (const r of list) {
    const t = r.thread_id;
    const cur = byThread.get(t);
    if (!cur) {
      byThread.set(t, { thread_id: t, offers: [r], last_at: r.created_at });
    } else {
      cur.offers.push(r);
      if (r.created_at > cur.last_at) cur.last_at = r.created_at;
    }
  }

  const threads = [...byThread.values()]
    .map((t) => {
      t.offers.sort((a, b) => a.created_at.localeCompare(b.created_at));
      return t;
    })
    .sort((a, b) => b.last_at.localeCompare(a.last_at));

  return NextResponse.json({ threads });
}

async function POST_handler(request: Request) {
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

  let expiresAt: string | null = null;
  if (typeof body.expires_at === "string" && body.expires_at.trim().length > 0) {
    const d = new Date(body.expires_at);
    if (!Number.isNaN(d.getTime()) && d.getTime() > Date.now()) {
      expiresAt = d.toISOString();
    }
  }

  if (!text && (itemsOffered.length > 0 || itemsRequested.length > 0 || offerNotes)) {
    text = buildStructuredOfferSummary(itemsOffered, itemsRequested, offerNotes);
  }

  if (!toUserId || !isUuidString(toUserId)) {
    logApiValidationFailure("POST /api/market/offers", "to_user_id", "invalid");
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

  const structured =
    structuredPayloadNonEmpty(itemsOffered, itemsRequested) || Boolean(offerNotes) || Boolean(expiresAt);

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
      expires_at: expiresAt,
    })
    .select(
      "id, thread_id, parent_offer_id, from_user_id, to_user_id, catalog_card_id, body, status, created_at, items_offered, items_requested, offer_notes, expires_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  mcaLog.event("market.offer.sent", { offerId: data.id, threadId: data.thread_id, toUserId }, CTX);
  if (structured) {
    mcaLog.event(
      "market.offer.structured",
      {
        offerId: data.id,
        offeredCount: itemsOffered.length,
        requestedCount: itemsRequested.length,
        hasNotes: Boolean(offerNotes),
        hasExpiry: Boolean(expiresAt),
      },
      CTX
    );
  }
  return NextResponse.json({ offer: data });
}

export const GET = defineRouteSimple("GET /api/market/offers", GET_handler);
export const POST = defineRouteSimple("POST /api/market/offers", POST_handler);
