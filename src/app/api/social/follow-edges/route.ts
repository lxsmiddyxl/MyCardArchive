import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

const CTX = { componentName: "api/social/follow-edges", surfaceName: "social.profile" } as const;

export const dynamic = "force-dynamic";

/** Minimal follow graph ids for client-side hints (Phase 66). */
async function GET_handler() {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const [followingRes, followersRes] = await Promise.all([
    supabase.from("user_follows").select("following_id").eq("follower_id", session.userId).limit(500),
    supabase.from("user_follows").select("follower_id").eq("following_id", session.userId).limit(500),
  ]);

  const err = followingRes.error ?? followersRes.error;
  if (err) {
    return errorJson(ctx, err.message, 500);
  }

  const following = [...new Set((followingRes.data ?? []).map((r) => r.following_id))];
  const followers = [...new Set((followersRes.data ?? []).map((r) => r.follower_id))];

  mcaLog.event("social.follow_edges.view", { viewerId: session.userId, following: following.length }, CTX);

  return successJson(ctx, { following, followers });
}

export const GET = defineRouteNoArgs("GET /api/social/follow-edges", GET_handler);
