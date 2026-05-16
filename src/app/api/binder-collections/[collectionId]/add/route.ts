import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

async function POST_handler(
  request: Request,
  { params }: { params: Record<string, string> }
) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const collectionId = params.collectionId?.trim() ?? "";
  let body: { binder_id?: string; position?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const binderId = body.binder_id?.trim() ?? "";
  if (!binderId) {
    return errorJson(ctx, "binder_id required", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const { data: binder } = await supabase
    .from("binders")
    .select("id")
    .eq("id", binderId)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (!binder) {
    return errorJson(ctx, "Binder not found", 404, { code: ApiErrorCode.NOT_FOUND });
  }

  const position =
    typeof body.position === "number" && Number.isFinite(body.position)
      ? Math.max(0, Math.floor(body.position))
      : 0;

  const { data, error } = await supabase
    .from("binder_collection_items")
    .insert({ collection_id: collectionId, binder_id: binderId, position })
    .select("id, collection_id, binder_id, position")
    .single();

  if (error) {
    if (error.code === "23505") {
      return successJson(ctx, { ok: true, duplicate: true });
    }
    return errorJson(ctx, error.message, 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }

  return successJson(ctx, { item: data });
}

export const POST = defineRoute(
  "POST /api/binder-collections/[collectionId]/add",
  POST_handler
);
