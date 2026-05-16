import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson, withContextId } from "@/lib/api/route-helpers";
import { getBinderPresence } from "@/lib/presence/ephemeral-store";
import { defineRoute } from "@/lib/server/api-route";

async function GET_handler(
  _request: Request,
  { params }: { params: Record<string, string> }
) {
  const ctx = withContextId();
  const binderId = params.binderId?.trim() ?? "";
  if (!binderId) {
    return errorJson(ctx, "binderId required", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const viewers = getBinderPresence(binderId);
  return successJson(ctx, {
    binder_id: binderId,
    count: viewers.length,
    viewers,
  });
}

export const GET = defineRoute("GET /api/presence/binder/[binderId]", GET_handler);
