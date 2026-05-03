import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { STORED_ACTIVITY_KEYS } from "@/lib/presence/presence-types";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/social/presence/touch", surfaceName: "social.profile" } as const;

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
  const act = typeof raw.activity === "string" ? raw.activity.trim() : "";

  const activity =
    act.length > 0 && (STORED_ACTIVITY_KEYS as readonly string[]).includes(act) ? act : null;

  const stateRaw = typeof raw.state === "string" ? raw.state.trim().toLowerCase() : "";
  const deviceRaw = typeof raw.device === "string" ? raw.device.trim().toLowerCase() : "";
  const stateOk =
    stateRaw === "" ||
    stateRaw === "online" ||
    stateRaw === "recently_active" ||
    stateRaw === "idle";
  const p_state = stateOk ? stateRaw : "";
  const p_device =
    deviceRaw === "web" || deviceRaw === "mobile" || deviceRaw === "unknown"
      ? deviceRaw
      : "web";

  const refreshRes = await supabase.rpc("refresh_user_presence", {
    p_user_id: user.id,
    p_state: p_state || "online",
    p_device: p_device,
  });

  if (refreshRes.error) {
    const legacy = await supabase.rpc("update_user_presence", {
      p_user_id: user.id,
      p_activity: activity,
    });
    if (legacy.error) {
      return NextResponse.json({ error: legacy.error.message }, { status: 500 });
    }
  } else if (activity) {
    const actErr = await supabase.rpc("update_user_presence", {
      p_user_id: user.id,
      p_activity: activity,
    });
    if (actErr.error) {
      return NextResponse.json({ error: actErr.error.message }, { status: 500 });
    }
  }

  const roomTypeRaw = typeof raw.roomType === "string" ? raw.roomType.trim().toLowerCase() : "";
  const topicKeyRaw = typeof raw.topicKey === "string" ? raw.topicKey.trim() : "";
  const roomOk =
    roomTypeRaw === "" ||
    roomTypeRaw === "set_room" ||
    roomTypeRaw === "club_room" ||
    roomTypeRaw === "live_feed_room" ||
    roomTypeRaw === "profile_room";
  if (roomOk && roomTypeRaw !== "") {
    void supabase.rpc("refresh_collector_room", {
      p_user_id: user.id,
      p_room_type: roomTypeRaw,
      p_topic_key: roomTypeRaw === "live_feed_room" ? "" : topicKeyRaw,
    });
  }

  mcaLog.event("social.presence.touch", { userId: user.id, activity: activity ?? "heartbeat" }, CTX);
  return NextResponse.json({ ok: true });
}

export const POST = defineRouteSimple("POST /api/social/presence/touch", POST_handler);
