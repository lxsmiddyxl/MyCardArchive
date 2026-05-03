import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/collector-rooms/refresh", surfaceName: "collector_rooms" } as const;

export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const roomTypeRaw = typeof raw.roomType === "string" ? raw.roomType.trim().toLowerCase() : "";
  const topicKeyRaw = typeof raw.topicKey === "string" ? raw.topicKey.trim() : "";

  if (
    roomTypeRaw !== "set_room" &&
    roomTypeRaw !== "club_room" &&
    roomTypeRaw !== "live_feed_room" &&
    roomTypeRaw !== "profile_room"
  ) {
    return NextResponse.json({ error: "Invalid roomType" }, { status: 400 });
  }

  if (roomTypeRaw !== "live_feed_room" && !topicKeyRaw) {
    return NextResponse.json({ error: "topicKey required for this room type" }, { status: 400 });
  }

  void supabase.rpc("refresh_user_presence", {
    p_user_id: user.id,
    p_state: "online",
    p_device: "web",
  });

  const { data: roomId, error } = await supabase.rpc("refresh_collector_room", {
    p_user_id: user.id,
    p_room_type: roomTypeRaw,
    p_topic_key: roomTypeRaw === "live_feed_room" ? "" : topicKeyRaw,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  mcaLog.event(
    "collector_rooms.refresh",
    { userId: user.id, roomType: roomTypeRaw, topicKey: topicKeyRaw || null },
    CTX
  );
  return NextResponse.json({ ok: true, roomId: roomId ?? null });
}

export const POST = defineRouteSimple("POST /api/collector-rooms/refresh", POST_handler);
