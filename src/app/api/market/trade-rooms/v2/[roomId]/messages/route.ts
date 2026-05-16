import { buildTradeRoomV2Payload, isTradeRoomParticipant, sanitizeTradeRoomMessage } from "@/lib/market/trade-room-v2";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/market/trade-rooms/v2/messages", surfaceName: "marketplace" } as const;

export const dynamic = "force-dynamic";

async function POST_handler(request: Request, context: { params: Record<string, string> }) {
  const roomId = context.params.roomId?.trim();
  if (!roomId || !isUuidString(roomId)) {
    return NextResponse.json({ error: "Invalid room id" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { message?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = sanitizeTradeRoomMessage(typeof body.message === "string" ? body.message : "");
  if (!text) return NextResponse.json({ error: "message required" }, { status: 400 });

  const { data: offers, error: oErr } = await supabase
    .from("market_offers")
    .select("id, thread_id, from_user_id, to_user_id, body, status, created_at")
    .eq("thread_id", roomId)
    .limit(1);

  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });
  const list = offers ?? [];
  if (list.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isTradeRoomParticipant(user.id, list)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: inserted, error: insErr } = await supabase
    .from("market_trade_room_messages")
    .insert({ thread_id: roomId, actor_id: user.id, body: text })
    .select("id, actor_id, body, created_at")
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  await supabase.from("market_trade_rooms").upsert({ thread_id: roomId, updated_at: new Date().toISOString() });

  mcaLog.event("market.trade_room.v2.message", { roomId, messageId: inserted.id }, CTX);
  return NextResponse.json({ message: { id: inserted.id, actorId: inserted.actor_id, body: inserted.body, createdAt: inserted.created_at } });
}

async function GET_handler(_request: Request, context: { params: Record<string, string> }) {
  const roomId = context.params.roomId?.trim();
  if (!roomId || !isUuidString(roomId)) {
    return NextResponse.json({ error: "Invalid room id" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: offers } = await supabase
    .from("market_offers")
    .select("id, thread_id, from_user_id, to_user_id, body, status, created_at, updated_at, items_offered, items_requested, offer_notes")
    .eq("thread_id", roomId)
    .order("created_at", { ascending: true });

  const list = offers ?? [];
  if (list.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isTradeRoomParticipant(user.id, list)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: messages } = await supabase
    .from("market_trade_room_messages")
    .select("id, actor_id, body, created_at")
    .eq("thread_id", roomId)
    .order("created_at", { ascending: true });

  const room = buildTradeRoomV2Payload({
    threadId: roomId,
    offers: list,
    messages: messages ?? [],
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ room });
}

export const GET = defineRoute("GET /api/market/trade-rooms/v2/[roomId]/messages", GET_handler);
export const POST = defineRoute("POST /api/market/trade-rooms/v2/[roomId]/messages", POST_handler);
