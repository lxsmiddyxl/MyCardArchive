import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, safePublicDbMessage, successJson, withContextId } from "@/lib/api/route-helpers";
import {
  CATALOG_CARD_DETAIL_SELECT,
  mapCatalogDbRowToHit,
  sortCatalogHitsByNumber,
} from "@/lib/catalog/catalog-rows";
import { createClient } from "@/lib/supabase/server";
import { defineRouteSimple } from "@/lib/server/api-route";

function parseCardNumberInt(raw: string): number | null {
  const slash = raw.split("/")[0]?.trim() ?? raw.trim();
  const digits = slash.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

/** GET `?setId=&number=` — nearby collector numbers in the same expansion. */
async function GET_handler(request: Request) {
  const ctx = withContextId();
  const { searchParams } = new URL(request.url);
  const setId = searchParams.get("setId")?.trim() ?? searchParams.get("set_id")?.trim() ?? "";
  const number = searchParams.get("number")?.trim() ?? "";
  const windowRaw = parseInt(searchParams.get("window") ?? "5", 10);
  const window = Math.min(12, Math.max(1, Number.isFinite(windowRaw) ? windowRaw : 5));

  if (!setId || !number) {
    return errorJson(ctx, "setId and number are required", 400, {
      code: ApiErrorCode.BAD_REQUEST,
      results: [],
    });
  }

  const center = parseCardNumberInt(number);
  if (center == null) {
    return successJson(ctx, { results: [] });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("catalog_cards")
    .select(CATALOG_CARD_DETAIL_SELECT)
    .eq("set_id", setId)
    .limit(200);

  if (error) {
    return errorJson(ctx, safePublicDbMessage(error.message), 500, {
      code: ApiErrorCode.SUPABASE_QUERY,
      results: [],
    });
  }

  const hits = (data ?? [])
    .map(mapCatalogDbRowToHit)
    .filter((h) => {
      const n = parseCardNumberInt(h.number);
      if (n == null) return false;
      return Math.abs(n - center) <= window && n !== center;
    });

  return successJson(ctx, { results: sortCatalogHitsByNumber(hits).slice(0, 12) });
}

export const GET = defineRouteSimple("GET /api/catalog/cards/nearby", GET_handler);
