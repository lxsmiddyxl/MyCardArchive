import { buildTradeRoomV2Payload, isTradeRoomParticipant } from "@/lib/market/trade-room-v2";
import { defineRouteSimple } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { thread_id?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const threadId = body.thread_id?.trim();
  if (!threadId || !isUuidString(threadId)) {
    return NextResponse.json({ error: "thread_id required" }, { status: 400 });
  }

  const { data: offers, error: oErr } = await supabase
    .from("market_offers")
    .select("id, thread_id, from_user_id, to_user_id, body, status, created_at, updated_at, items_offered, items_requested, offer_notes")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });
  const list = offers ?? [];
  if (list.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isTradeRoomParticipant(user.id, list)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await supabase.from("market_trade_rooms").upsert({ thread_id: threadId, updated_at: new Date().toISOString() });

  const { data: messages } = await supabase
    .from("market_trade_room_messages")
    .select("id, actor_id, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  const room = buildTradeRoomV2Payload({
    threadId,
    offers: list,
    messages: messages ?? [],
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ room });
}

export const POST = defineRouteSimple("POST /api/market/trade-rooms/v2/create", POST_handler);
