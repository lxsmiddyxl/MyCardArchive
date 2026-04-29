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

  const { error } = await supabase.rpc("update_user_presence", {
    p_user_id: user.id,
    p_activity: activity,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  mcaLog.event("social.presence.touch", { userId: user.id, activity: activity ?? "heartbeat" }, CTX);
  return NextResponse.json({ ok: true });
}

export const POST = defineRouteSimple("POST /api/social/presence/touch", POST_handler);
