import { ApiErrorCode } from "@/lib/api/api-error-codes";
import {
  errorJson,
  safePublicDbMessage,
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

/** GET `?binderId=&catalog_card_id=` — duplicate catalog card check in a binder. */
async function GET_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const { searchParams } = new URL(request.url);
  const binderId = searchParams.get("binderId")?.trim() ?? searchParams.get("binder_id")?.trim() ?? "";
  const catalogCardId =
    searchParams.get("catalog_card_id")?.trim() ?? searchParams.get("catalogCardId")?.trim() ?? "";

  if (!binderId || !catalogCardId) {
    return errorJson(ctx, "binderId and catalog_card_id are required", 400, {
      code: ApiErrorCode.BAD_REQUEST,
      count: 0,
      card_ids: [],
    });
  }

  const { data: binder, error: binderErr } = await supabase
    .from("binders")
    .select("id")
    .eq("id", binderId)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (binderErr) {
    return errorJson(ctx, safePublicDbMessage(binderErr.message), 500, {
      code: ApiErrorCode.SUPABASE_QUERY,
      count: 0,
      card_ids: [],
    });
  }

  if (!binder) {
    return errorJson(ctx, "Binder not found", 404, { count: 0, card_ids: [] });
  }

  const { data, error } = await supabase
    .from("cards")
    .select("id")
    .eq("binder_id", binderId)
    .eq("user_id", session.userId)
    .eq("catalog_card_id", catalogCardId);

  if (error) {
    return errorJson(ctx, safePublicDbMessage(error.message), 500, {
      code: ApiErrorCode.SUPABASE_QUERY,
      count: 0,
      card_ids: [],
    });
  }

  const card_ids = (data ?? []).map((r) => r.id);
  return successJson(ctx, { count: card_ids.length, card_ids, duplicate: card_ids.length > 0 });
}

export const GET = defineRouteSimple("GET /api/cards/duplicate-check", GET_handler);
