import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { logApiValidationFailure } from "@/lib/server/validation-telemetry";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/social/unfollow", surfaceName: "social.profile" } as const;

async function POST_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { targetUserId?: string } = {};
  try {
    body = (await request.json()) as { targetUserId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const targetUserId = body.targetUserId?.trim();
  if (!targetUserId || !isUuidString(targetUserId)) {
    logApiValidationFailure("POST /api/social/unfollow", "targetUserId", "invalid");
    return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
  }

  if (targetUserId === user.id) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  const { error, count } = await supabase
    .from("user_follows")
    .delete({ count: "exact" })
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  mcaLog.event(
    "social.unfollow",
    { targetUserId, followerId: user.id, removed: (count ?? 0) > 0 },
    CTX
  );
  return NextResponse.json({ ok: true, targetUserId });
}

export const POST = defineRouteSimple("POST /api/social/unfollow", POST_handler);
