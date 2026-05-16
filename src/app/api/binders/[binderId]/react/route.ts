import { ApiErrorCode } from "@/lib/api/api-error-codes";
import {
  errorJson,
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import { isBinderShareable, parseBinderVisibility } from "@/lib/binders/binder-social-types";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

const ALLOWED = new Set(["👍", "❤️", "🔥", "😂", "🎉", "🎴", "⚡", "✨"]);

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

  let body: { emoji?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const emoji = body.emoji?.trim() ?? "";
  if (!ALLOWED.has(emoji)) {
    return errorJson(ctx, "Invalid emoji", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const { data: binder } = await supabase
    .from("binders")
    .select("id, visibility")
    .eq("id", binderId)
    .maybeSingle();

  if (!binder) {
    return errorJson(ctx, "Binder not found", 404, { code: ApiErrorCode.NOT_FOUND });
  }

  if (!isBinderShareable(parseBinderVisibility(binder.visibility))) {
    return errorJson(ctx, "Binder is not shareable", 403, { code: ApiErrorCode.FORBIDDEN });
  }

  const { data: existing } = await supabase
    .from("binder_reactions")
    .select("id")
    .eq("binder_id", binderId)
    .eq("user_id", session.userId)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    const { error: delErr } = await supabase
      .from("binder_reactions")
      .delete()
      .eq("binder_id", binderId)
      .eq("user_id", session.userId)
      .eq("emoji", emoji);
    if (delErr) {
      return errorJson(ctx, delErr.message, 500, { code: ApiErrorCode.SUPABASE_QUERY });
    }
    return successJson(ctx, { active: false, emoji });
  }

  const { error: insErr } = await supabase.from("binder_reactions").insert({
    binder_id: binderId,
    user_id: session.userId,
    emoji,
  });

  if (insErr) {
    return errorJson(ctx, insErr.message, 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }

  return successJson(ctx, { active: true, emoji });
}

export const POST = defineRoute("POST /api/binders/[binderId]/react", POST_handler);
