import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

async function POST_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  let body: { ordered_ids?: string[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const ids = body.ordered_ids ?? [];
  if (!ids.length) {
    return errorJson(ctx, "ordered_ids required", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]?.trim();
    if (!id) continue;
    await supabase
      .from("profile_showcase_items")
      .update({ position: i })
      .eq("id", id)
      .eq("user_id", session.userId);
  }

  return successJson(ctx, { ok: true, count: ids.length });
}

export const POST = defineRouteSimple("POST /api/profile/showcase/reorder", POST_handler);
