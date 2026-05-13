import {
  errorJson,
  safePublicDbMessage,
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import { ApiErrorCode } from "@/lib/api/api-error-codes";
import type { MarketplaceReadonlyViewV3DTO } from "@/lib/dto/marketplace-v3";
import {
  buildPriceSignalsFromListings,
  mapDiscoveryJsonToCardsV3,
  mapMarketOfferRowToV3DTO,
} from "@/lib/marketplace/v3-mappers";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";

async function GET_handler() {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const [{ data: disc, error: discErr }, { data: offerRows, error: offErr }] = await Promise.all([
    supabase.rpc("get_market_discovery"),
    supabase
      .from("market_offers")
      .select("id, thread_id, status, catalog_card_id, created_at, updated_at, body, items_offered, items_requested")
      .or(`from_user_id.eq.${session.userId},to_user_id.eq.${session.userId}`)
      .order("updated_at", { ascending: false })
      .limit(40),
  ]);

  if (discErr) {
    return errorJson(ctx, safePublicDbMessage(discErr.message), 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }
  if (offErr) {
    return errorJson(ctx, safePublicDbMessage(offErr.message), 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }

  const mapped = mapDiscoveryJsonToCardsV3(disc);
  const signals = buildPriceSignalsFromListings(mapped.want_by_catalog, mapped.offer_by_catalog, 10);
  const top_listings = [...mapped.offer_by_catalog, ...mapped.want_by_catalog]
    .filter((x) => x.catalog_card_id)
    .sort((a, b) => b.collector_count - a.collector_count)
    .slice(0, 12);

  const threads = new Set<string>();
  for (const r of offerRows ?? []) {
    if (r.status === "pending") threads.add(r.thread_id);
  }

  const offers_preview = (offerRows ?? []).slice(0, 6).map((r) =>
    mapMarketOfferRowToV3DTO({
      id: r.id,
      thread_id: r.thread_id,
      status: r.status,
      catalog_card_id: r.catalog_card_id,
      created_at: r.created_at,
      updated_at: r.updated_at,
      body: r.body,
      items_offered: r.items_offered,
      items_requested: r.items_requested,
    })
  );

  const body: MarketplaceReadonlyViewV3DTO = {
    generated_at: new Date().toISOString(),
    my_open_offer_threads: threads.size,
    top_listings,
    top_price_signals: signals,
  };

  return successJson(ctx, { view: body, offers_preview });
}

export const GET = defineRouteSimple("GET /api/market/v3/views", GET_handler);
