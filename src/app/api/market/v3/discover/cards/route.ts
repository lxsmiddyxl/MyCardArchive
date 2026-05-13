import {
  errorJson,
  safePublicDbMessage,
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { mapDiscoveryJsonToCardsV3 } from "@/lib/marketplace/v3-mappers";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";

async function GET_handler() {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const { data, error } = await supabase.rpc("get_market_discovery");
  if (error) {
    return errorJson(ctx, safePublicDbMessage(error.message), 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }
  const discovery = mapDiscoveryJsonToCardsV3(data);
  return successJson(ctx, { discovery });
}

export const GET = defineRouteSimple("GET /api/market/v3/discover/cards", GET_handler);
