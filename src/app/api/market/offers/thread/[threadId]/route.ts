import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function GET_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  const threadId = context.params.threadId?.trim();
  if (!threadId || !isUuidString(threadId)) {
    return NextResponse.json({ error: "Invalid thread id" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: offers, error: oErr } = await supabase
    .from("market_offers")
    .select(
      "id, thread_id, parent_offer_id, from_user_id, to_user_id, catalog_card_id, body, status, created_at, updated_at, items_offered, items_requested, offer_notes, expires_at"
    )
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (oErr) {
    return NextResponse.json({ error: oErr.message }, { status: 500 });
  }

  const list = offers ?? [];
  if (list.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const participant = list.some((r) => r.from_user_id === user.id || r.to_user_id === user.id);
  if (!participant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: events, error: eErr } = await supabase
    .from("market_offer_events")
    .select("id, thread_id, offer_id, event_type, actor_id, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (eErr) {
    return NextResponse.json({ error: eErr.message }, { status: 500 });
  }

  return NextResponse.json({ offers: list, events: events ?? [] });
}

export const GET = defineRoute("GET /api/market/offers/thread/[threadId]", GET_handler);
