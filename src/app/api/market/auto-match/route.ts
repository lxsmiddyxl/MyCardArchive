import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/market/auto-match", surfaceName: "marketplace" } as const;

export const dynamic = "force-dynamic";

async function GET_handler() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("get_market_auto_matches");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  mcaLog.event("market.auto_match.trigger", { viewerId: user.id }, CTX);

  return NextResponse.json({ matches: data ?? { reciprocal: [], loops_3: [] } });
}

export const GET = defineRouteSimple("GET /api/market/auto-match", GET_handler);
