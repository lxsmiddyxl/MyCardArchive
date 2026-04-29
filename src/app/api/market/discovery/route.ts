import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/market/discovery", surfaceName: "marketplace" } as const;

export const dynamic = "force-dynamic";

async function GET_handler(_request: Request) {
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

  mcaLog.event("market.browse", { viewerId: user.id }, CTX);
  return NextResponse.json({ discovery: data });
}

export const GET = defineRouteSimple("GET /api/market/discovery", GET_handler);
