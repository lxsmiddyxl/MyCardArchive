import type { McaLogEnvelope } from "@/lib/logging/types";
import { defineRouteSimple } from "@/lib/server/api-route";
import { pushMcaTelemetry } from "@/lib/server/mca-telemetry-buffer";
import { createClient } from "@/lib/supabase/server";
import { recordTelemetryEvent } from "@/lib/telemetry/aggregation";
import { buildEvent } from "@/lib/telemetry/schema";
import { NextResponse } from "next/server";

const LEVELS = new Set(["info", "warn", "error", "event", "timing"]);

function isMcaEnvelope(body: unknown): body is McaLogEnvelope {
  if (!body || typeof body !== "object") return false;
  const o = body as Record<string, unknown>;
  if (typeof o.level !== "string" || !LEVELS.has(o.level)) return false;
  if (typeof o.name !== "string" || o.name.length === 0 || o.name.length > 200) return false;
  if (typeof o.data !== "object" || o.data === null || Array.isArray(o.data)) return false;
  if (typeof o.ts !== "number" || !Number.isFinite(o.ts)) return false;
  if (typeof o.componentName !== "string" || o.componentName.length > 120) return false;
  if (typeof o.surfaceName !== "string" || o.surfaceName.length > 120) return false;
  if (o.traceId !== undefined && typeof o.traceId !== "string") return false;
  return true;
}

export const POST = defineRouteSimple("POST /api/log", async (request) => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const text = await request.text();
  if (text.length > 32_000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isMcaEnvelope(parsed)) {
    return NextResponse.json({ error: "Invalid envelope" }, { status: 400 });
  }

  const withUser: McaLogEnvelope = {
    ...parsed,
    data: { ...parsed.data, _userId: user.id },
  };

  pushMcaTelemetry(withUser);

  const latencyRaw = withUser.data.latencyMs;
  const latencyMs =
    typeof latencyRaw === "number" && Number.isFinite(latencyRaw) ? latencyRaw : undefined;

  recordTelemetryEvent(
    buildEvent({
      eventType: withUser.name,
      userId: user.id,
      success: withUser.level !== "error",
      payloadSummary: {
        level: withUser.level,
        componentName: withUser.componentName,
        surfaceName: withUser.surfaceName,
      },
      latencyMs,
    })
  );

  return new NextResponse(null, { status: 204 });
});
