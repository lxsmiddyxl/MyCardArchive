import { runDiagnostics } from "@/lib/diagnostics";
import type { DiagnosticResult } from "@/lib/diagnostics/types";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CTX = { componentName: "health", surfaceName: "diagnostics" } as const;

function extractPredictiveSection(results: DiagnosticResult[]) {
  const snap = results.find((r) => r.name === "predictiveSnapshotCheck");
  const data = snap?.data;
  if (!data || typeof data !== "object") return undefined;
  const o = data as Record<string, unknown>;
  if (!Array.isArray(o.predictions)) return undefined;
  return {
    predictions: o.predictions,
    highestSeverity: o.highestSeverity,
  };
}

function extractPerfSection(results: DiagnosticResult[]) {
  const hp = results.find((r) => r.name === "hotPathLatencyCheck");
  const ch = results.find((r) => r.name === "cacheHealthCheck");
  const hpData = hp?.data && typeof hp.data === "object" ? (hp.data as Record<string, unknown>) : null;
  const chData = ch?.data && typeof ch.data === "object" ? (ch.data as Record<string, unknown>) : null;
  if (!hpData && !chData) return undefined;
  return {
    hotPaths: hpData?.hotPaths,
    cache: chData?.cache,
  };
}

function extractLoadSection(results: DiagnosticResult[]) {
  const load = results.find((r) => r.name === "loadStateCheck");
  const shed = results.find((r) => r.name === "sheddingActivityCheck");
  const deg = results.find((r) => r.name === "degradationModeCheck");
  const loadData = load?.data && typeof load.data === "object" ? (load.data as Record<string, unknown>) : null;
  const shedData = shed?.data && typeof shed.data === "object" ? (shed.data as Record<string, unknown>) : null;
  const degData = deg?.data && typeof deg.data === "object" ? (deg.data as Record<string, unknown>) : null;
  if (!loadData && !shedData && !degData) return undefined;
  return {
    loadState: loadData?.loadState,
    degradationMode: degData?.degradationMode ?? loadData?.degradationMode,
    shedding: Array.isArray(shedData?.shedding) ? shedData.shedding : undefined,
    snapshot: loadData?.snapshot,
    sheddingFlags: loadData?.sheddingFlags,
  };
}

async function GET_handler(): Promise<Response> {
  const timestamp = Date.now();
  try {
    const results = await runDiagnostics();
    const ok = results.every((r) => r.ok);
    const predictive = extractPredictiveSection(results);
    const load = extractLoadSection(results);
    const perf = extractPerfSection(results);
    return NextResponse.json({ ok, results, timestamp, predictive, load, perf }, { status: 200 });
  } catch (err) {
    mcaLog.error("health.diagnostics", { err }, CTX);
    return NextResponse.json(
      { ok: false, results: [], timestamp, error: "diagnostics_failed" },
      { status: 200 }
    );
  }
}

export const GET = defineRouteNoArgs("GET /api/health/diagnostics", GET_handler);
