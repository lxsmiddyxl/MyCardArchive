import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson } from "@/lib/api/route-helpers";
import { resolveBinderRouteSession } from "@/lib/binders/binder-route-context";
import {
  normalizeSlotRef,
  swapBinderSlots,
} from "@/lib/binders/binder-slot-ops";
import { defineRoute } from "@/lib/server/api-route";

async function POST_handler(
  request: Request,
  { params }: { params: Record<string, string> }
) {
  const resolved = await resolveBinderRouteSession(params.binderId);
  if (!resolved.ok) return resolved.response;

  const { ctx, supabase, binderId } = resolved.session;

  let body: { from?: unknown; to?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const from = normalizeSlotRef(body.from);
  const to = normalizeSlotRef(body.to);
  if (!from || !to) {
    return errorJson(ctx, "from and to must be { page, slot }", 400, {
      code: ApiErrorCode.BAD_REQUEST,
    });
  }

  const result = await swapBinderSlots(supabase, binderId, from, to);
  if (!result.ok) {
    return errorJson(ctx, result.message, 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }

  return successJson(ctx, { ok: true, duration_ms: Date.now() - ctx.startedAt });
}

export const POST = defineRoute("POST /api/binders/[binderId]/move", POST_handler);
