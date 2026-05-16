import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, safePublicDbMessage, successJson, withContextId } from "@/lib/api/route-helpers";
import {
  CATALOG_CARD_DETAIL_SELECT,
  mapCatalogDbRowToHit,
  sortCatalogHitsByNumber,
} from "@/lib/catalog/catalog-rows";
import { createClient } from "@/lib/supabase/server";
import { defineRouteSimple } from "@/lib/server/api-route";

/** GET `?setId=` — sample cards from an expansion for suggestions (default 24). */
async function GET_handler(request: Request) {
  const ctx = withContextId();
  const { searchParams } = new URL(request.url);
  const setId = searchParams.get("setId")?.trim() ?? searchParams.get("set_id")?.trim() ?? "";
  const limitRaw = parseInt(searchParams.get("limit") ?? "24", 10);
  const limit = Math.min(40, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 24));

  if (!setId) {
    return errorJson(ctx, "setId is required", 400, { code: ApiErrorCode.BAD_REQUEST, results: [] });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("catalog_cards")
    .select(CATALOG_CARD_DETAIL_SELECT)
    .eq("set_id", setId)
    .order("number", { ascending: true })
    .limit(limit);

  if (error) {
    return errorJson(ctx, safePublicDbMessage(error.message), 500, {
      code: ApiErrorCode.SUPABASE_QUERY,
      results: [],
    });
  }

  return successJson(ctx, { results: sortCatalogHitsByNumber((data ?? []).map(mapCatalogDbRowToHit)) });
}

export const GET = defineRouteSimple("GET /api/catalog/cards/by-set", GET_handler);
