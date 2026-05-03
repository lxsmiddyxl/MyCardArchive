import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { getActiveRegion } from "@/lib/regions/region-state";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CTX = { componentName: "health", surfaceName: "region_active" } as const;

async function GET_handler(): Promise<Response> {
  try {
    return NextResponse.json({ activeRegion: getActiveRegion() }, { status: 200 });
  } catch (err) {
    mcaLog.error("health.region.active", { err }, CTX);
    return NextResponse.json({ activeRegion: getActiveRegion() }, { status: 200 });
  }
}

export const GET = defineRouteNoArgs("GET /api/health/region/active", GET_handler);
