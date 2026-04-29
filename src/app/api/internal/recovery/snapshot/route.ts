import { defineRouteNoArgs } from "@/lib/server/api-route";
import { getRecoveryAttempts } from "@/lib/server/recovery-state";
import { getIngestBackoffState } from "@/lib/server/telemetry-ingest-backoff";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const GET = defineRouteNoArgs("GET /api/internal/recovery/snapshot", async () => {
  return NextResponse.json(
    {
      ok: true,
      attempts: getRecoveryAttempts(),
      ingestBackoff: getIngestBackoffState(),
      timestamp: Date.now(),
    },
    { status: 200 }
  );
});
