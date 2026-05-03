import {
  checkRegionHealth,
  isSecondaryRegionConfigured,
} from "@/lib/failover/failover-engine";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { isRegionFailoverEnabled } from "@/lib/regions/region-config";
import { getActiveRegion } from "@/lib/regions/region-state";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CTX = { componentName: "health", surfaceName: "region" } as const;

function maxLatencyMs(bundle: {
  supabaseRest: { latencyMs: number };
  realtime: { latencyMs: number };
  telemetry: { latencyMs: number };
}): number {
  return Math.max(bundle.supabaseRest.latencyMs, bundle.realtime.latencyMs, bundle.telemetry.latencyMs);
}

async function GET_handler(): Promise<Response> {
  const timestamp = Date.now();
  try {
    const health = await checkRegionHealth();
    const primary = {
      ok: health.primary.ok,
      latencyMs: maxLatencyMs(health.primary),
    };
    const secondary = isSecondaryRegionConfigured(health)
      ? { ok: health.secondary.ok, latencyMs: maxLatencyMs(health.secondary) }
      : { ok: false, latencyMs: 0 };

    return NextResponse.json(
      {
        ok: true,
        activeRegion: getActiveRegion(),
        primary,
        secondary,
        failoverEnabled: isRegionFailoverEnabled(),
        timestamp,
      },
      { status: 200 }
    );
  } catch (err) {
    mcaLog.error("health.region", { err }, CTX);
    return NextResponse.json(
      {
        ok: false,
        activeRegion: getActiveRegion(),
        primary: { ok: false, latencyMs: 0 },
        secondary: { ok: false, latencyMs: 0 },
        failoverEnabled: isRegionFailoverEnabled(),
        timestamp,
      },
      { status: 200 }
    );
  }
}

export const GET = defineRouteNoArgs("GET /api/health/region", GET_handler);
