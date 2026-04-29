import { ingestHotPathSamples } from "@/lib/perf/hot-paths";
import { defineRouteSimple } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const POST = defineRouteSimple("POST /api/internal/perf/hot-paths", async (request) => {
  if (process.env.STABILITY_MODE !== "1") {
    return NextResponse.json({ error: "Not enabled" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const samples = o?.samples;
  if (!Array.isArray(samples)) {
    return NextResponse.json({ error: "samples required" }, { status: 400 });
  }

  const normalized: Array<{ id: string; durationMs: number }> = [];
  for (const s of samples) {
    if (!s || typeof s !== "object") continue;
    const r = s as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.durationMs !== "number") continue;
    normalized.push({ id: r.id, durationMs: r.durationMs });
  }

  ingestHotPathSamples(normalized);
  return NextResponse.json({ ok: true, accepted: normalized.length }, { status: 200 });
});
