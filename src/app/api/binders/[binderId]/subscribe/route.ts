import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { subscribeToBinder } from "@/lib/binders/binder-subscriptions";
import { notifyBinderSubscribed } from "@/lib/notifications/binder-events";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

async function POST_handler(
  _request: Request,
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

  const result = await subscribeToBinder(supabase, session.userId, binderId);
  if (!result.ok) {
    const status = result.error === "Binder not found" ? 404 : 400;
    return errorJson(ctx, result.error, status, {
      code: status === 404 ? ApiErrorCode.NOT_FOUND : ApiErrorCode.BAD_REQUEST,
    });
  }

  if (!result.alreadySubscribed) {
    const { data: binder } = await supabase
      .from("binders")
      .select("name, user_id")
      .eq("id", binderId)
      .maybeSingle();
    const { data: actor } = await supabase
      .from("social_public_profiles")
      .select("display_name, username")
      .eq("user_id", session.userId)
      .maybeSingle();
    if (binder && binder.user_id !== session.userId) {
      void notifyBinderSubscribed({
        ownerUserId: binder.user_id,
        subscriberId: session.userId,
        subscriberDisplay:
          actor?.display_name?.trim() || actor?.username?.trim() || "A collector",
        binderId,
        binderName: binder.name,
      });
    }
  }

  return successJson(ctx, {
    ok: true,
    binder_id: binderId,
    already_subscribed: Boolean(result.alreadySubscribed),
  });
}

export const POST = defineRoute("POST /api/binders/[binderId]/subscribe", POST_handler);
