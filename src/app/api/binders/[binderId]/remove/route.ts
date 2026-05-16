import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson } from "@/lib/api/route-helpers";
import { resolveBinderRouteSession } from "@/lib/binders/binder-route-context";
import {
  assignCardToSlot,
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

  let body: {
    page_number?: number;
    slot_index?: number;
    page?: number;
    slot?: number;
    delete_card?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const ref =
    normalizeSlotRef(body) ??
    normalizeSlotRef({ page: body.page_number, slot: body.slot_index });

  if (!ref) {
    return errorJson(ctx, "page/slot or page_number/slot_index required", 400, {
      code: ApiErrorCode.BAD_REQUEST,
    });
  }

  const { data: slotRow } = await supabase
    .from("binder_slots")
    .select("card_id")
    .eq("binder_id", binderId)
    .eq("page_number", ref.page)
    .eq("slot_index", ref.slot)
    .maybeSingle();

  const cardId = slotRow?.card_id ?? null;

  const cleared = await assignCardToSlot(supabase, binderId, userId, ref, null);
  if (!cleared.ok) {
    return errorJson(ctx, cleared.message, 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }

  if (body.delete_card && cardId) {
    const { error: delErr } = await supabase
      .from("cards")
      .delete()
      .eq("id", cardId)
      .eq("user_id", userId)
      .eq("binder_id", binderId);
    if (delErr) {
      return errorJson(ctx, delErr.message, 500, { code: ApiErrorCode.SUPABASE_QUERY });
    }
  }

  return successJson(ctx, {
    ok: true,
    removed_card_id: cardId,
    duration_ms: Date.now() - ctx.startedAt,
  });
}

export const POST = defineRoute("POST /api/binders/[binderId]/remove", POST_handler);
