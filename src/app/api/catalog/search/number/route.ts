import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, safePublicDbMessage, successJson, withContextId } from "@/lib/api/route-helpers";
import {
  CATALOG_CARD_DETAIL_SELECT,
  mapCatalogDbRowToHit,
  sortCatalogHitsByNumber,
} from "@/lib/catalog/catalog-rows";
import { parseNumberQuery } from "@/lib/catalog/search-modes";
import { resolveCatalogSetIdFromCode } from "@/lib/catalog/resolve-set";
import { createClient } from "@/lib/supabase/server";
import { defineRouteSimple } from "@/lib/server/api-route";

function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** GET `?query=` — number-first catalog search (fraction, set code + number, or digits). */
async function GET_handler(request: Request) {
  const ctx = withContextId();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? searchParams.get("q")?.trim() ?? "";
  const limitRaw = parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Math.min(40, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20));

  if (query.length < 1) {
    return errorJson(ctx, "query is required", 400, { code: ApiErrorCode.BAD_REQUEST, results: [] });
  }

  const parsed = parseNumberQuery(query);
  if (!parsed) {
    return successJson(ctx, { results: [], mode: "number" as const, unique: false });
  }

  const supabase = createClient();
  let setId: string | null = null;
  if (parsed.setCode) {
    setId = await resolveCatalogSetIdFromCode(supabase, parsed.setCode);
  }

  const numEsc = escapeIlike(parsed.number);
  let qb = supabase
    .from("catalog_cards")
    .select(CATALOG_CARD_DETAIL_SELECT)
    .limit(limit);

  if (parsed.number.includes("/")) {
    qb = qb.ilike("number", numEsc);
  } else {
    qb = qb.or(`number.eq.${parsed.number},number.ilike.${parsed.number}/%`);
  }

  if (setId) {
    qb = qb.eq("set_id", setId);
  }

  const { data, error } = await qb;

  if (error) {
    return errorJson(ctx, safePublicDbMessage(error.message), 500, {
      code: ApiErrorCode.SUPABASE_QUERY,
      results: [],
    });
  }

  const results = sortCatalogHitsByNumber((data ?? []).map(mapCatalogDbRowToHit));
  const unique =
    results.length === 1 &&
    (Boolean(parsed.fractionTotal) || parsed.number.includes("/") || Boolean(setId));

  return successJson(ctx, { results, mode: "number" as const, unique });
}

export const GET = defineRouteSimple("GET /api/catalog/search/number", GET_handler);
