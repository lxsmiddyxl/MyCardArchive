import { pingSupabaseRest } from "@/lib/health/supabase-ping";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { getLastMcaTelemetryEventAgeMs } from "@/lib/server/mca-telemetry-buffer";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const STALL_MS = 120_000;
const CTX = { componentName: "health", surfaceName: "realtime" } as const;

export type ChannelStatus = "connected" | "degraded" | "unconfigured";

async function GET_handler(): Promise<Response> {
  const timestamp = Date.now();
  try {
    let channelStatus: ChannelStatus = "unconfigured";
    let dbOk = false;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!url || !anon) {
      channelStatus = "unconfigured";
      mcaLog.error("health.realtime", { message: "Supabase URL/anon key missing" }, CTX);
    } else {
      const reachable = await pingSupabaseRest();
      if (!reachable) {
        mcaLog.error("health.realtime", { message: "PostgREST ping failed" }, CTX);
        channelStatus = "degraded";
      } else {
        dbOk = true;
        channelStatus = "connected";
      }
    }

    const lastEventAgeMs = getLastMcaTelemetryEventAgeMs();
    const stalled = lastEventAgeMs !== null && lastEventAgeMs > STALL_MS;
    const ok = dbOk && !stalled;

    return NextResponse.json(
      {
        ok,
        lastEventAgeMs,
        channelStatus,
        timestamp,
        stallThresholdMs: STALL_MS,
      },
      { status: 200 }
    );
  } catch (err) {
    mcaLog.error("health.realtime", { err }, CTX);
    return NextResponse.json(
      {
        ok: false,
        lastEventAgeMs: getLastMcaTelemetryEventAgeMs(),
        channelStatus: "degraded" as const,
        timestamp,
      },
      { status: 200 }
    );
  }
}

export const GET = defineRouteNoArgs("GET /api/health/realtime", GET_handler);
