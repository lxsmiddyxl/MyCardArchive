import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

async function POST_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  let body: { name?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const name = body.name?.trim() ?? "";
  if (!name || name.length > 80) {
    return errorJson(ctx, "name required (max 80)", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const { data, error } = await supabase
    .from("binder_collections")
    .insert({ user_id: session.userId, name })
    .select("id, user_id, name, created_at")
    .single();

  if (error || !data) {
    return errorJson(ctx, error?.message ?? "Create failed", 500, {
      code: ApiErrorCode.SUPABASE_QUERY,
    });
  }

  return successJson(ctx, { collection: data });
}

export const POST = defineRouteSimple("POST /api/binder-collections/create", POST_handler);
