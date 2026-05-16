import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson } from "@/lib/api/route-helpers";
import { resolveBinderRouteSession } from "@/lib/binders/binder-route-context";
import { isBinderShareable, parseBinderVisibility } from "@/lib/binders/binder-social-types";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

async function GET_handler(
  _request: Request,
  { params }: { params: Record<string, string> }
) {
  const binderId = params.binderId?.trim() ?? "";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: binder } = await supabase
    .from("binders")
    .select("id, user_id, visibility")
    .eq("id", binderId)
    .maybeSingle();

  const ctx = { contextId: "binder-comments", startedAt: Date.now() } as const;
  if (!binder) {
    return errorJson(ctx, "Binder not found", 404, { code: ApiErrorCode.NOT_FOUND });
  }

  const visibility = parseBinderVisibility(binder.visibility);
  const isOwner = Boolean(user?.id && user.id === binder.user_id);
  if (!isOwner && !isBinderShareable(visibility)) {
    return errorJson(ctx, "Forbidden", 403, { code: ApiErrorCode.FORBIDDEN });
  }

  const { data: comments, error } = await supabase
    .from("binder_comments")
    .select("id, binder_id, user_id, text, created_at")
    .eq("binder_id", binderId)
    .order("created_at", { ascending: true });

  if (error) {
    return errorJson(ctx, error.message, 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }

  const userIds = [...new Set((comments ?? []).map((c) => c.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase
        .from("social_public_profiles")
        .select("user_id, display_name, handle, username")
        .in("user_id", userIds)
    : { data: [] };

  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.user_id,
      p.display_name?.trim() || p.handle?.trim() || p.username?.trim() || "Collector",
    ])
  );

  return successJson(ctx, {
    comments: (comments ?? []).map((c) => ({
      ...c,
      author_display: profileMap.get(c.user_id) ?? "Collector",
    })),
  });
}

export const GET = defineRoute("GET /api/binders/[binderId]/comments", GET_handler);
