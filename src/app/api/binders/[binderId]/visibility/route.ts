import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson } from "@/lib/api/route-helpers";
import { logBinderActivity } from "@/lib/binders/binder-activity";
import { resolveBinderRouteSession } from "@/lib/binders/binder-route-context";
import {
  parseBinderVisibility,
  type BinderVisibility,
} from "@/lib/binders/binder-social-types";
import { defineRoute } from "@/lib/server/api-route";

const ALLOWED = new Set<BinderVisibility>(["private", "unlisted", "public"]);

async function POST_handler(
  request: Request,
  { params }: { params: Record<string, string> }
) {
  const resolved = await resolveBinderRouteSession(params.binderId);
  if (!resolved.ok) return resolved.response;

  const { ctx, supabase, userId, binderId } = resolved.session;

  let body: { visibility?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const visibility = parseBinderVisibility(body.visibility);
  if (!ALLOWED.has(visibility)) {
    return errorJson(ctx, "Invalid visibility", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const { data, error } = await supabase
    .from("binders")
    .update({ visibility })
    .eq("id", binderId)
    .eq("user_id", userId)
    .select("id, visibility")
    .maybeSingle();

  if (error || !data) {
    return errorJson(ctx, error?.message ?? "Update failed", 500, {
      code: ApiErrorCode.SUPABASE_QUERY,
    });
  }

  await logBinderActivity(supabase, {
    binderId,
    userId,
    type: "visibility_changed",
    payload: { visibility },
  });

  return successJson(ctx, {
    binder_id: binderId,
    visibility: data.visibility,
    share_url: `/b/${binderId}`,
  });
}

export const POST = defineRoute(
  "POST /api/binders/[binderId]/visibility",
  POST_handler
);
