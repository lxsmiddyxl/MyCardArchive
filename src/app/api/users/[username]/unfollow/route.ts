import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { resolveProfileByHandle } from "@/lib/social/resolve-handle";
import { unfollowUser } from "@/lib/social/user-follow";
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

  const result = await unfollowUser(supabase, session.userId, profile.id);
  if (!result.ok) {
    return errorJson(ctx, result.error, 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }

  return successJson(ctx, { ok: true, user_id: profile.id });
}

export const POST = defineRoute("POST /api/users/[username]/unfollow", POST_handler);
