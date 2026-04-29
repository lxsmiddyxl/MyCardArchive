import { defineRouteNoArgs } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const GET = defineRouteNoArgs("GET /api/health/ui", async () => {
  const started = performance.now();
  await Promise.resolve();
  const responseTimeMs = Math.round((performance.now() - started) * 100) / 100;
  return NextResponse.json(
    {
      ok: true,
      responseTimeMs,
      timestamp: Date.now(),
    },
    { status: 200 }
  );
});
