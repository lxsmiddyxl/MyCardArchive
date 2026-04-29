import { defineRouteSimple } from "@/lib/server/api-route";
import {
  ingestStabilityMetrics,
  isStabilityModeEnabled,
  type SyntheticInpPayload,
  type VirtualizationRegressionPayload,
} from "@/lib/server/mca-stability-metrics";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const POST = defineRouteSimple("POST /api/internal/stability/metrics", async (request) => {
  if (!isStabilityModeEnabled()) {
    return NextResponse.json({ error: "Not enabled" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const virtualization = o.virtualization;
  const syntheticInp = o.syntheticInp;

  const vObj =
    virtualization && typeof virtualization === "object"
      ? (virtualization as Record<string, unknown>)
      : undefined;
  const sObj =
    syntheticInp && typeof syntheticInp === "object"
      ? (syntheticInp as Record<string, unknown>)
      : undefined;

  ingestStabilityMetrics({
    virtualization: vObj as Partial<VirtualizationRegressionPayload> | undefined,
    syntheticInp: sObj as Partial<SyntheticInpPayload> | undefined,
  });

  return NextResponse.json({ ok: true }, { status: 200 });
});
