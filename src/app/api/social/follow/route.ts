import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { logApiValidationFailure } from "@/lib/server/validation-telemetry";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/social/follow", surfaceName: "social.profile" } as const;

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
    logApiValidationFailure("POST /api/social/follow", "targetUserId", "invalid");
    return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
  }

  if (targetUserId === user.id) {
    logApiValidationFailure("POST /api/social/follow", "targetUserId", "self");
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  await supabase.rpc("ensure_social_public_profile_projection", { p_user_id: targetUserId });
  const { data: target } = await supabase
    .from("social_public_profiles")
    .select("user_id")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { error } = await supabase.from("user_follows").insert({
    follower_id: user.id,
    following_id: targetUserId,
  });

  if (error) {
    if (error.code === "23505") {
      mcaLog.event("social.follow.real", { targetUserId, duplicate: true }, CTX);
      return NextResponse.json({ ok: true, targetUserId, alreadyFollowing: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  mcaLog.event("social.follow.real", { targetUserId, followerId: user.id }, CTX);
  return NextResponse.json({ ok: true, targetUserId, stubbed: false });
}

export const POST = defineRouteSimple("POST /api/social/follow", POST_handler);
