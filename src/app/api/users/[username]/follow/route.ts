import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import {
  notifyNewFollower,
} from "@/lib/notifications/binder-events";
import { resolveProfileByHandle } from "@/lib/social/resolve-handle";
import { followUser } from "@/lib/social/user-follow";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

async function POST_handler(
  _request: Request,
  { params }: { params: Record<string, string> }
) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const profile = await resolveProfileByHandle(supabase, params.username ?? "");
  if (!profile) {
    return errorJson(ctx, "Profile not found", 404, { code: ApiErrorCode.NOT_FOUND });
  }

  const result = await followUser(supabase, session.userId, profile.id);
  if (!result.ok) {
    return errorJson(ctx, result.error, 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  if (!result.alreadyFollowing) {
    const { data: actor } = await supabase
      .from("social_public_profiles")
      .select("display_name, username")
      .eq("user_id", session.userId)
      .maybeSingle();
    const followerDisplay =
      actor?.display_name?.trim() || actor?.username?.trim() || "A collector";
    void notifyNewFollower({
      followedUserId: profile.id,
      followerId: session.userId,
      followerDisplay,
    });
  }

  return successJson(ctx, {
    ok: true,
    user_id: profile.id,
    already_following: Boolean(result.alreadyFollowing),
  });
}

export const POST = defineRoute("POST /api/users/[username]/follow", POST_handler);
