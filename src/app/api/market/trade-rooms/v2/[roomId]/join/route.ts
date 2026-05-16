import { buildTradeRoomV2Payload, isTradeRoomParticipant } from "@/lib/market/trade-room-v2";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/market/trade-rooms/v2/join", surfaceName: "marketplace" } as const;

export const dynamic = "force-dynamic";

async function POST_handler(_request: Request, context: { params: Record<string, string> }) {
  const roomId = context.params.roomId?.trim();
  if (!roomId || !isUuidString(roomId)) {
    return NextResponse.json({ error: "Invalid room id" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: offers, error: oErr } = await supabase
    .from("market_offers")
    .select("id, thread_id, from_user_id, to_user_id, body, status, created_at, updated_at, items_offered, items_requested, offer_notes")
    .eq("thread_id", roomId)
    .order("created_at", { ascending: true });

  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });
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

  mcaLog.event("market.trade_room.v2.join", { roomId, viewerId: user.id }, CTX);
  return NextResponse.json({ room });
}

export const POST = defineRoute("POST /api/market/trade-rooms/v2/[roomId]/join", POST_handler);
