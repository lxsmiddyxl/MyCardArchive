import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson, withContextId } from "@/lib/api/route-helpers";
import { resolveProfileByHandle } from "@/lib/social/resolve-handle";
import { getProfileFollowCounts, listFollowers } from "@/lib/social/user-follow";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

async function GET_handler(
  _request: Request,
  { params }: { params: Record<string, string> }
) {
  const ctx = withContextId();
  const supabase = createClient();

  const profile = await resolveProfileByHandle(supabase, params.username ?? "");
  if (!profile) {
    return errorJson(ctx, "Profile not found", 404, { code: ApiErrorCode.NOT_FOUND });
  }

  const [followers, counts] = await Promise.all([
    listFollowers(supabase, profile.id),
    getProfileFollowCounts(supabase, profile.id),
  ]);

  return successJson(ctx, {
    user_id: profile.id,
    followers,
    counts,
  });
}

export const GET = defineRoute("GET /api/users/[username]/followers", GET_handler);
