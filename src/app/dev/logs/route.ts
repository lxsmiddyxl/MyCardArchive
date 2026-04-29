import { getRecentLogs } from "@/lib/server/observability";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Recent server-side log lines (ring buffer). No secrets — messages are sanitized in observability.
 */
export async function GET() {
  const logs = getRecentLogs();
  return NextResponse.json({
    count: logs.length,
    logs,
    timestamp: new Date().toISOString(),
  });
}
