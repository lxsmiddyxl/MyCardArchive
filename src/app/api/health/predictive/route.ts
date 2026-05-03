import {
  highestSeverityFromPredictions,
  isPredictiveModeEnabled,
  runPredictors,
} from "@/lib/predictive/predictive-engine";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CTX = { componentName: "health", surfaceName: "predictive" } as const;

async function GET_handler(): Promise<Response> {
  const timestamp = Date.now();
  try {
    if (!isPredictiveModeEnabled()) {
      return NextResponse.json(
        {
          ok: true,
          predictions: [],
          highestSeverity: "none",
          timestamp,
          note: "PREDICTIVE_MODE=0",
        },
        { status: 200 }
      );
    }
    const predictions = await runPredictors();
    const highestSeverity = highestSeverityFromPredictions(predictions);
    const ok = highestSeverity !== "critical";
    return NextResponse.json(
      { ok, predictions, highestSeverity, timestamp },
      { status: 200 }
    );
  } catch (err) {
    mcaLog.error("health.predictive", { err }, CTX);
    return NextResponse.json(
      { ok: false, predictions: [], highestSeverity: "none", timestamp, error: "predictive_failed" },
      { status: 200 }
    );
  }
}

export const GET = defineRouteNoArgs("GET /api/health/predictive", GET_handler);
