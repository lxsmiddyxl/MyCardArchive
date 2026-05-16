import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, safePublicDbMessage, successJson, withContextId } from "@/lib/api/route-helpers";
import {
  CATALOG_CARD_DETAIL_SELECT,
  mapCatalogDbRowToHit,
  sortCatalogHitsByNumber,
} from "@/lib/catalog/catalog-rows";
import { resolveCatalogSetIdsFromQuery } from "@/lib/catalog/resolve-set";
import { createClient } from "@/lib/supabase/server";
import { defineRouteSimple } from "@/lib/server/api-route";

/** GET `?query=` — set-first catalog search: resolve expansion, return cards sorted by number (max 50). */
async function GET_handler(request: Request) {
  const ctx = withContextId();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? searchParams.get("q")?.trim() ?? "";
  const limitRaw = parseInt(searchParams.get("limit") ?? "50", 10);
  const limit = Math.min(50, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 50));

  if (query.length < 1) {
    return errorJson(ctx, "query is required", 400, { code: ApiErrorCode.BAD_REQUEST, results: [] });
  }

  const supabase = createClient();
  const setIds = await resolveCatalogSetIdsFromQuery(supabase, query, 1);
  const setId = setIds[0];
  if (!setId) {
    return successJson(ctx, { results: [], set_id: null, mode: "set" as const });
  }

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

  const results = sortCatalogHitsByNumber((data ?? []).map(mapCatalogDbRowToHit));
  return successJson(ctx, { results, set_id: setId, mode: "set" as const });
}

export const GET = defineRouteSimple("GET /api/catalog/search/set", GET_handler);
