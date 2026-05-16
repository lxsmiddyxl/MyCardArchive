import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson, withContextId } from "@/lib/api/route-helpers";
import {
  getBinderSubscriberCount,
  listBinderSubscribers,
} from "@/lib/binders/binder-subscriptions";
import { isBinderShareable, parseBinderVisibility } from "@/lib/binders/binder-social-types";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

async function GET_handler(
  _request: Request,
  { params }: { params: Record<string, string> }
) {
  const ctx = withContextId();
  const supabase = createClient();
  const binderId = params.binderId?.trim() ?? "";
  if (!binderId) {
    return errorJson(ctx, "binderId required", 400, { code: ApiErrorCode.BAD_REQUEST });
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

  const [subscribers, count] = await Promise.all([
    listBinderSubscribers(supabase, binderId),
    getBinderSubscriberCount(supabase, binderId),
  ]);

  return successJson(ctx, { binder_id: binderId, count, subscribers });
}

export const GET = defineRoute("GET /api/binders/[binderId]/subscribers", GET_handler);
