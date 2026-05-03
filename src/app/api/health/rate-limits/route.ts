import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { getRateLimitHealthBuckets } from "@/lib/server/rate-limit-api";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CTX = { componentName: "health", surfaceName: "rate-limits" } as const;

async function GET_handler(): Promise<Response> {
  const timestamp = Date.now();
  try {
    const buckets = getRateLimitHealthBuckets();
    const saturated = Object.values(buckets).some((b) => b.used >= b.limit);
    const ok = !saturated;

    return NextResponse.json(
      {
        ok,
        buckets,
        timestamp,
      },
      { status: 200 }
    );
  } catch (err) {
    mcaLog.error("health.rate-limits", { err }, CTX);
    return NextResponse.json(
      {
        ok: false,
        buckets: {},
        timestamp,
      },
      { status: 200 }
    );
  }
}

export const GET = defineRouteNoArgs("GET /api/health/rate-limits", GET_handler);
