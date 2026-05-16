import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson } from "@/lib/api/route-helpers";
import { resolveBinderRouteSession } from "@/lib/binders/binder-route-context";
import {
  copyCardToSlot,
  normalizeSlotRef,
} from "@/lib/binders/binder-slot-ops";
import { defineRoute } from "@/lib/server/api-route";

async function POST_handler(
  request: Request,
  { params }: { params: Record<string, string> }
) {
  const resolved = await resolveBinderRouteSession(params.binderId);
  if (!resolved.ok) return resolved.response;

  const { ctx, supabase, userId, binderId } = resolved.session;

  let body: { card_id?: string; to?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const cardId = body.card_id?.trim() ?? "";
  const to = normalizeSlotRef(body.to);
  if (!cardId || !to) {
    return errorJson(ctx, "card_id and to { page, slot } are required", 400, {
      code: ApiErrorCode.BAD_REQUEST,
    });
  }

  const result = await copyCardToSlot(supabase, binderId, userId, cardId, to);
  if (!result.ok) {
    return errorJson(ctx, result.message, 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  return successJson(ctx, {
    ok: true,
    card_id: result.card_id,
    duration_ms: Date.now() - ctx.startedAt,
  });
}

export const POST = defineRoute("POST /api/binders/[binderId]/copy", POST_handler);
