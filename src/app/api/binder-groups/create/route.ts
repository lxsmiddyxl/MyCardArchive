import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

async function POST_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  let body: { title?: string; description?: string; cover_url?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const title = body.title?.trim() ?? "";
  if (!title) {
    return errorJson(ctx, "title required", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const { data, error } = await supabase
    .from("binder_groups")
    .insert({
      user_id: session.userId,
      title,
      description: body.description?.trim() || null,
      cover_url: body.cover_url?.trim() || null,
    })
    .select("id, user_id, title, description, cover_url, created_at")
    .single();

  if (error || !data) {
    return errorJson(ctx, error?.message ?? "Create failed", 500, {
      code: ApiErrorCode.SUPABASE_QUERY,
    });
  }

  return successJson(ctx, { group: data });
}

export const POST = defineRouteSimple("POST /api/binder-groups/create", POST_handler);
