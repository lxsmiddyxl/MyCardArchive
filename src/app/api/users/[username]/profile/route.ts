import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson, withContextId } from "@/lib/api/route-helpers";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

async function GET_handler(
  _request: Request,
  { params }: { params: Record<string, string> }
) {
  const ctx = withContextId();
  const handle = params.username?.trim().replace(/^@/, "").toLowerCase() ?? "";
  if (!handle) {
    return errorJson(ctx, "username required", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, handle, username, bio, avatar_url, created_at")
    .ilike("handle", handle)
    .maybeSingle();

  if (!profile) {
    return errorJson(ctx, "Profile not found", 404, { code: ApiErrorCode.NOT_FOUND });
  }

  const { data: publicBinders } = await supabase
    .from("binders")
    .select("id, name, description, visibility, updated_at")
    .eq("user_id", profile.id)
    .eq("visibility", "public")
    .order("updated_at", { ascending: false })
    .limit(24);

  const { data: activity } = await supabase
    .from("binder_activity")
    .select("id, binder_id, type, payload, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(12);

  return successJson(ctx, {
    profile: {
      user_id: profile.id,
      username: profile.handle ?? profile.username,
      display_name: profile.display_name,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
    },
    public_binders: (publicBinders ?? []).map((b) => ({
      ...b,
      share_url: `/b/${b.id}`,
    })),
    recent_activity: activity ?? [],
  });
}

export const GET = defineRoute("GET /api/users/[username]/profile", GET_handler);
