import {
  errorJson,
  safePublicDbMessage,
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { trendFromDiscoveryJson } from "@/lib/marketplace/trend-intelligence";
import { defineRouteSimple } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";

async function GET_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const url = new URL(request.url);
  const catalogCardId = url.searchParams.get("catalog_card_id")?.trim() ?? "";
  if (!isUuidString(catalogCardId)) {
    return errorJson(ctx, "catalog_card_id required", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const { data, error } = await supabase.rpc("get_market_discovery");
  if (error) {
    return errorJson(ctx, safePublicDbMessage(error.message), 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }
  const trend = trendFromDiscoveryJson(catalogCardId, data);
  return successJson(ctx, { trend });
}

export const GET = defineRouteSimple("GET /api/market/v3/trends", GET_handler);
