import { getTelemetrySnapshot } from "@/lib/telemetry/aggregation";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Aggregated metrics (counts, latency averages, error rates).
 * Protected: `x-internal-telemetry-secret` OR dev session.
 */
async function GET_handler(request: Request) {
  const secret = request.headers.get("x-internal-telemetry-secret");
  if (
    typeof process.env.INTERNAL_TELEMETRY_SECRET === "string" &&
    process.env.INTERNAL_TELEMETRY_SECRET.length > 0 &&
    secret === process.env.INTERNAL_TELEMETRY_SECRET
  ) {
    return NextResponse.json(getTelemetrySnapshot());
  }

  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(getTelemetrySnapshot());
}

export const GET = defineRouteSimple("GET /api/internal/telemetry", GET_handler);
