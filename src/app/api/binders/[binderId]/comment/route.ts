import { ApiErrorCode } from "@/lib/api/api-error-codes";
import {
  errorJson,
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import { isBinderShareable, parseBinderVisibility } from "@/lib/binders/binder-social-types";
import { notifyBinderComment } from "@/lib/notifications/binder-events";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

const MAX_LEN = 2000;

async function POST_handler(
  request: Request,
  { params }: { params: Record<string, string> }
) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const binderId = params.binderId?.trim() ?? "";
  if (!binderId) {
    return errorJson(ctx, "binderId required", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  let body: { text?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const text = body.text?.trim() ?? "";
  if (!text || text.length > MAX_LEN) {
    return errorJson(ctx, "text is required (max 2000 chars)", 400, {
      code: ApiErrorCode.BAD_REQUEST,
    });
  }

  const { data: binder } = await supabase
    .from("binders")
    .select("id, visibility, user_id, name")
    .eq("id", binderId)
    .maybeSingle();

  if (!binder) {
    return errorJson(ctx, "Binder not found", 404, { code: ApiErrorCode.NOT_FOUND });
  }

  if (!isBinderShareable(parseBinderVisibility(binder.visibility))) {
    return errorJson(ctx, "Binder is not shareable", 403, { code: ApiErrorCode.FORBIDDEN });
  }

  const { data, error } = await supabase
    .from("binder_comments")
    .insert({ binder_id: binderId, user_id: session.userId, text })
    .select("id, binder_id, user_id, text, created_at")
    .single();

  if (error || !data) {
    return errorJson(ctx, error?.message ?? "Insert failed", 500, {
      code: ApiErrorCode.SUPABASE_QUERY,
    });
  }

  const { data: actor } = await supabase
    .from("social_public_profiles")
    .select("display_name, username")
    .eq("user_id", session.userId)
    .maybeSingle();
  if (binder) {
    void notifyBinderComment({
      ownerUserId: binder.user_id,
      actorId: session.userId,
      actorDisplay:
        actor?.display_name?.trim() || actor?.username?.trim() || "A collector",
      binderId,
      binderName: binder.name,
      preview: text.length > 80 ? `${text.slice(0, 77)}…` : text,
    });
  }

  return successJson(ctx, { comment: data });
}

export const POST = defineRoute("POST /api/binders/[binderId]/comment", POST_handler);
