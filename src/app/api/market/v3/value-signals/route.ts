import { mapDiscoveryJsonToCardsV3 } from "@/lib/marketplace/v3-mappers";
import { buildValueSignalsV2 } from "@/lib/market/value-signals-v2";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function GET_handler() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("get_market_discovery");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const discovery = mapDiscoveryJsonToCardsV3(data as Record<string, unknown>);
  const signals = buildValueSignalsV2(discovery.want_by_catalog, discovery.offer_by_catalog);

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    signals,
  });
}

export const GET = defineRouteSimple("GET /api/market/v3/value-signals", GET_handler);
