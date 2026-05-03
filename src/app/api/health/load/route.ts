import { getDegradationMode, getLoadState, getLoadStateRingBuffer, refreshLoadState } from "@/lib/load/load-state";
import { getCacheStats } from "@/lib/cache/cache-store";
import { getLoadSheddingFlags, runSheddingRules } from "@/lib/load/load-shedding";
import { getRecentSheddingEvents } from "@/lib/load/shedding-events";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CTX = { componentName: "health", surfaceName: "load" } as const;

async function GET_handler(): Promise<Response> {
  const timestamp = Date.now();
  try {
    const { level, snapshot } = await refreshLoadState();
    await runSheddingRules(level);
    const degradationMode = getDegradationMode();
    const ok = level !== "critical" && degradationMode !== "degrade:severe";
    const cache = getCacheStats();
    const perfHints = {
      cacheTtlScale: level === "critical" ? 0.65 : level === "high" ? 0.8 : level === "elevated" ? 0.9 : 1,
      cacheHitRatio:
        cache.hits + cache.misses > 0 ? Math.round((cache.hits / (cache.hits + cache.misses)) * 1000) / 1000 : null,
      preferReadThroughCache: level === "high" || level === "critical",
      loadState: getLoadState(),
    };
    return NextResponse.json(
      {
        ok,
        loadState: level,
        degradationMode,
        flags: getLoadSheddingFlags(),
        snapshot,
        ring: getLoadStateRingBuffer().slice(-12),
        sheddingEvents: getRecentSheddingEvents().slice(-16),
        perfHints,
        timestamp,
      },
      { status: 200 }
    );
  } catch (err) {
    mcaLog.error("health.load", { err }, CTX);
    return NextResponse.json(
      {
        ok: false,
        loadState: "normal",
        degradationMode: "degrade:none",
        error: "load_refresh_failed",
        timestamp,
      },
      { status: 200 }
    );
  }
}

export const GET = defineRouteNoArgs("GET /api/health/load", GET_handler);
