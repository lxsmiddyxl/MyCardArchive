import "server-only";

import { checkRegionHealth, shouldFailover } from "@/lib/failover/failover-engine";
import { getPrimaryRegion, getSecondaryRegion } from "@/lib/regions/region-config";
import { pingSupabaseRest } from "@/lib/health/supabase-ping";
import { getLastMcaTelemetryEventAgeMs } from "@/lib/server/mca-telemetry-buffer";
import {
  getSyntheticInpSnapshot,
  getVirtualizationRegressionSnapshot,
  isStabilityModeEnabled,
} from "@/lib/server/mca-stability-metrics";
import { getIngestBackoffState, isIngestBackoffActive } from "@/lib/server/telemetry-ingest-backoff";
import { evaluateLatencyBudget, getLatencyBudget } from "@/lib/perf/latency-budgets";
import { HOT_PATH_IDS } from "@/lib/perf/hot-path-ids";
import { getHotPathStats } from "@/lib/perf/hot-paths";
import {
  getRegionPrimaryLatencySeries,
  getRealtimeAgeSeries,
  getSyntheticInpSeries,
  getTelemetryStreakSeries,
  getVirtualizationAnomalySeries,
  getVirtualizationOverscanSeries,
  recordRealtimeEventAgeSample,
  recordRegionPrimaryLatencySample,
  recordSyntheticInpSample,
  recordTelemetryStreakSample,
  recordVirtualizationSamples,
  sparklineFromSeries,
} from "@/lib/predictive/predictive-samples";

export type PredictionSeverity = "info" | "warn" | "critical";

export type PredictionResult = {
  name: string;
  ok: boolean;
  severity: PredictionSeverity;
  confidence: number;
  signal: string;
  data?: unknown;
  ts: number;
};

export type PredictorFn = () => Promise<PredictionResult>;

export const PredictiveRegistry = new Map<string, PredictorFn>();

export function registerPredictor(name: string, fn: PredictorFn): void {
  PredictiveRegistry.set(name, fn);
}

export function isPredictiveModeEnabled(): boolean {
  return process.env.PREDICTIVE_MODE !== "0";
}

export function getPredictiveConfidenceThreshold(): number {
  const raw = process.env.PREDICTIVE_CONFIDENCE_THRESHOLD?.trim();
  if (!raw) return 0.85;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 && n <= 1 ? n : 0.85;
}

function linearSlopeY(values: readonly number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xs = values.map((_, i) => i);
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (values[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  return den > 1e-9 ? num / den : 0;
}

const STALL_MS = 120_000;

async function realtimeLatencyPredictor(): Promise<PredictionResult> {
  const ts = Date.now();
  const lastAge = getLastMcaTelemetryEventAgeMs();
  recordRealtimeEventAgeSample(lastAge);
  const series = getRealtimeAgeSeries();
  const sparkline = sparklineFromSeries(series);
  const slope = linearSlopeY(series);
  const ageNow =
    lastAge ??
    (series.length ? series[series.length - 1] : 0);

  let severity: PredictionSeverity = "info";
  let ok = true;
  let confidence = 0.2;
  let signal = "Realtime event age stable or insufficient history";

  if (series.length >= 3 && slope > 3000 && ageNow > 45_000) {
    ok = false;
    severity = ageNow > 85_000 ? "critical" : "warn";
    confidence = Math.min(1, 0.45 + (slope / 25_000) * 0.35 + (ageNow / STALL_MS) * 0.4);
    signal = "Rising event-age slope — early stall risk before channel hard stall";
  } else if (ageNow >= 0.75 * STALL_MS) {
    ok = false;
    severity = "warn";
    confidence = Math.min(1, 0.5 + ageNow / STALL_MS * 0.45);
    signal = "Event age approaching stall threshold";
  }

  return {
    name: "realtimeLatencyPredictor",
    ok,
    severity,
    confidence,
    signal,
    data: { lastEventAgeMs: lastAge, slope, sparkline, seriesLength: series.length },
    ts,
  };
}

async function telemetryIngestPredictor(): Promise<PredictionResult> {
  const ts = Date.now();
  const { streak, until } = getIngestBackoffState();
  const backoffActive = isIngestBackoffActive();
  recordTelemetryStreakSample(streak);
  const series = getTelemetryStreakSeries();
  const sparkline = sparklineFromSeries(series);
  const slope = linearSlopeY(series);
  const last = series.length ? series[series.length - 1] : streak;

  let severity: PredictionSeverity = "info";
  let ok = true;
  let confidence = 0.2;
  let signal = "Ingest backoff quiet";

  if (streak >= 6 || (backoffActive && streak >= 4)) {
    ok = false;
    severity = "critical";
    confidence = Math.min(1, 0.55 + streak * 0.06);
    signal = "High ingest failure streak — outage risk";
  } else if (streak >= 3 || slope > 0.4 || (backoffActive && streak >= 2)) {
    ok = false;
    severity = "warn";
    confidence = Math.min(1, 0.4 + streak * 0.06 + (slope > 0 ? 0.2 : 0));
    signal = "Rising ingest backoff pattern — risk of sustained degradation";
  }

  return {
    name: "telemetryIngestPredictor",
    ok,
    severity,
    confidence,
    signal,
    data: { streak, backoffUntil: until, backoffActive, slope, sparkline },
    ts,
  };
}

async function virtualizationLoadPredictor(): Promise<PredictionResult> {
  const ts = Date.now();
  const snap = getVirtualizationRegressionSnapshot();
  const stale = snap.stale || !isStabilityModeEnabled();
  recordVirtualizationSamples(snap.anomalyScore, snap.overscanHits);
  const anomalySeries = getVirtualizationAnomalySeries();
  const overscanSeries = getVirtualizationOverscanSeries();
  const sparkA = sparklineFromSeries(anomalySeries);
  const sparkO = sparklineFromSeries(overscanSeries);
  const slopeA = linearSlopeY(anomalySeries);

  let severity: PredictionSeverity = "info";
  let ok = true;
  let confidence = 0.2;
  let signal = "Virtualization load nominal";

  if (stale) {
    return {
      name: "virtualizationLoadPredictor",
      ok: true,
      severity: "info",
      confidence: 0.1,
      signal: "No recent virtualization metrics (stability mode or stale)",
      data: { stale: true, sparkline: sparkA },
      ts,
    };
  }

  if (snap.anomalyScore >= 0.85 || snap.overscanHits > 800) {
    ok = false;
    severity = "critical";
    confidence = Math.min(1, 0.5 + snap.anomalyScore * 0.45);
    signal = "High virtualization anomaly score — render-loop risk";
  } else if (snap.anomalyScore >= 0.5 || slopeA > 0.03 || snap.overscanHits > 500) {
    ok = false;
    severity = "warn";
    confidence = Math.min(1, 0.35 + snap.anomalyScore * 0.5 + Math.min(0.2, slopeA * 5));
    signal = "Elevated rAF / overscan pattern — rising render pressure";
  }

  return {
    name: "virtualizationLoadPredictor",
    ok,
    severity,
    confidence,
    signal,
    data: {
      anomalyScore: snap.anomalyScore,
      overscanHits: snap.overscanHits,
      layoutThrashScore: snap.layoutThrashScore,
      slopeAnomaly: slopeA,
      sparklineAnomaly: sparkA,
      sparklineOverscan: sparkO,
    },
    ts,
  };
}

async function syntheticInpPredictor(): Promise<PredictionResult> {
  const ts = Date.now();
  const s = getSyntheticInpSnapshot();
  if (s.stale || s.samples === 0 || !isStabilityModeEnabled()) {
    return {
      name: "syntheticInpPredictor",
      ok: true,
      severity: "info",
      confidence: 0.1,
      signal: "No synthetic INP history",
      data: { stale: s.stale, samples: s.samples, sparkline: [] },
      ts,
    };
  }
  recordSyntheticInpSample(s.lastMs);
  const series = getSyntheticInpSeries();
  const sparkline = sparklineFromSeries(series);
  const slope = linearSlopeY(series);

  let severity: PredictionSeverity = "info";
  let ok = true;
  let confidence = 0.2;
  let signal = "Synthetic INP within range";

  if (s.lastMs >= 500 || (series.length >= 3 && slope > 30 && s.lastMs > 400)) {
    ok = false;
    severity = s.lastMs >= 500 ? "critical" : "warn";
    confidence = Math.min(1, 0.4 + s.lastMs / 800 + (slope > 0 ? 0.15 : 0));
    signal = "Synthetic INP rising — UI responsiveness degradation risk";
  } else if (s.lastMs > 350) {
    ok = false;
    severity = "warn";
    confidence = Math.min(1, 0.35 + s.lastMs / 700);
    signal = "Synthetic INP elevated";
  }

  return {
    name: "syntheticInpPredictor",
    ok,
    severity,
    confidence,
    signal,
    data: { lastMs: s.lastMs, samples: s.samples, slope, sparkline },
    ts,
  };
}

function isConfiguredSupabaseUrl(url: string): boolean {
  if (!url.startsWith("https://")) return false;
  try {
    const host = new URL(url).hostname;
    if (host === "example.supabase.co" || host.endsWith(".example.invalid")) return false;
    return host.endsWith(".supabase.co") || process.env.PREDICTIVE_ALLOW_CUSTOM_SUPABASE_HOST === "1";
  } catch {
    return false;
  }
}

async function regionHealthPredictor(): Promise<PredictionResult> {
  const ts = Date.now();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  if (!supabaseUrl || !isConfiguredSupabaseUrl(supabaseUrl)) {
    return {
      name: "regionHealthPredictor",
      ok: true,
      severity: "info",
      confidence: 0.05,
      signal:
        "Region health skipped — set NEXT_PUBLIC_SUPABASE_URL to a real project URL (https://*.supabase.co)",
      data: { skipped: true, reason: "url_missing_or_template" },
      ts,
    };
  }
  const health = await checkRegionHealth();
  const pr = health.primary.supabaseRest;
  const prt = health.primary.realtime;
  const pt = health.primary.telemetry;
  const maxLat = Math.max(pr.latencyMs, prt.latencyMs, pt.latencyMs);
  recordRegionPrimaryLatencySample(maxLat);
  const series = getRegionPrimaryLatencySeries();
  const sparkline = sparklineFromSeries(series);
  const slope = linearSlopeY(series);

  let severity: PredictionSeverity = "info";
  let ok = true;
  let confidence = 0.25;
  let signal = "Primary region latency stable";

  if (!health.primary.ok) {
    ok = false;
    severity = "critical";
    confidence = 0.92;
    signal = "Primary region unhealthy — failover may be required";
  } else if (shouldFailover(health)) {
    ok = false;
    severity = "critical";
    confidence = 0.88;
    signal = "Failover conditions trending — secondary healthy while primary degrades";
  } else if (series.length >= 3 && slope > 20 && maxLat > 400) {
    ok = false;
    severity = "warn";
    confidence = Math.min(1, 0.4 + maxLat / 2000 + slope / 200);
    signal = "Primary region latency rising — degradation risk";
  } else if (maxLat > 1500) {
    ok = false;
    severity = "warn";
    confidence = Math.min(1, 0.45 + maxLat / 4000);
    signal = "High cross-service latency for primary region";
  }

  return {
    name: "regionHealthPredictor",
    ok,
    severity,
    confidence,
    signal,
    data: {
      primaryRegion: getPrimaryRegion(),
      secondaryRegion: getSecondaryRegion() || null,
      primaryOk: health.primary.ok,
      maxLatencyMs: maxLat,
      slope,
      sparkline,
      supabaseRest: pr.latencyMs,
      realtime: prt.latencyMs,
      telemetry: pt.latencyMs,
    },
    ts,
  };
}

async function perfLatencyPredictor(): Promise<PredictionResult> {
  const ts = Date.now();
  const stats = getHotPathStats();
  const byId = new Map(stats.map((s) => [s.id, s]));
  let severity: PredictionSeverity = "info";
  let ok = true;
  let confidence = 0.2;
  let signal = "Hot path p95 within latency budgets";
  const paths: Array<{ id: string; p95: number; budget: number; ratio: number }> = [];

  let hasSamples = false;
  for (const id of HOT_PATH_IDS) {
    const s = byId.get(id);
    const budget = getLatencyBudget(id);
    if (!s || s.samples === 0) {
      paths.push({ id, p95: 0, budget, ratio: 0 });
      continue;
    }
    hasSamples = true;
    const ratio = budget > 0 ? s.p95 / budget : 0;
    const ev = evaluateLatencyBudget(id, s);
    paths.push({ id, p95: s.p95, budget, ratio });
    if (ratio >= 1.35) {
      severity = "critical";
      ok = false;
      confidence = Math.max(confidence, 0.9);
    } else if (ratio >= 1.05 || !ev.ok) {
      if (severity !== "critical") severity = "warn";
      ok = false;
      confidence = Math.max(confidence, 0.55 + Math.min(0.35, (ratio - 1) * 0.8));
    }
  }

  if (!hasSamples) {
    return {
      name: "perfLatencyPredictor",
      ok: true,
      severity: "info",
      confidence: 0.12,
      signal: "No hot path samples yet — instrumentation warming up",
      data: { paths },
      ts,
    };
  }

  if (!ok && severity === "critical") {
    signal = "Hot path latency materially over budget — UX at risk";
  } else if (!ok) {
    signal = "Hot path p95 approaching or over budget";
  }

  return {
    name: "perfLatencyPredictor",
    ok,
    severity,
    confidence: Math.min(1, confidence),
    signal,
    data: { paths },
    ts,
  };
}

registerPredictor("realtimeLatencyPredictor", realtimeLatencyPredictor);
registerPredictor("telemetryIngestPredictor", telemetryIngestPredictor);
registerPredictor("virtualizationLoadPredictor", virtualizationLoadPredictor);
registerPredictor("syntheticInpPredictor", syntheticInpPredictor);
registerPredictor("regionHealthPredictor", regionHealthPredictor);
registerPredictor("perfLatencyPredictor", perfLatencyPredictor);

let lastCache: PredictionResult[] = [];
let lastCacheAt = 0;
const CACHE_MS = 80;

async function executePredictors(): Promise<PredictionResult[]> {
  if (!isPredictiveModeEnabled()) {
    return [];
  }
  /** Prime realtime age from same source as health (PostgREST) for correlation. */
  void pingSupabaseRest();

  const out: PredictionResult[] = [];
  for (const [name, fn] of PredictiveRegistry.entries()) {
    try {
      out.push(await fn());
    } catch (err) {
      out.push({
        name,
        ok: false,
        severity: "warn",
        confidence: 0.5,
        signal: "Predictor threw",
        data: { error: err instanceof Error ? err.message : String(err) },
        ts: Date.now(),
      });
    }
  }
  return out;
}

export async function runPredictors(): Promise<PredictionResult[]> {
  if (!isPredictiveModeEnabled()) {
    return [];
  }
  const now = Date.now();
  if (now - lastCacheAt < CACHE_MS && lastCache.length > 0) {
    return lastCache;
  }
  lastCache = await executePredictors();
  lastCacheAt = now;
  return lastCache;
}

export function highestSeverityFromPredictions(preds: PredictionResult[]): PredictionSeverity | "none" {
  if (preds.length === 0) return "none";
  if (preds.some((p) => p.severity === "critical")) return "critical";
  if (preds.some((p) => p.severity === "warn")) return "warn";
  if (preds.some((p) => p.severity === "info")) return "info";
  return "none";
}

export function predictorRecoveryActionName(predictorName: string): string | null {
  const m: Record<string, string> = {
    realtimeLatencyPredictor: "realtimeRecoveryAction",
    telemetryIngestPredictor: "telemetryRecoveryAction",
    virtualizationLoadPredictor: "virtualizationRecoveryAction",
    syntheticInpPredictor: "uiResponsivenessRecoveryAction",
    regionHealthPredictor: "regionFailoverAction",
    perfLatencyPredictor: "uiResponsivenessRecoveryAction",
  };
  return m[predictorName] ?? null;
}

export function resetPredictiveCacheForTests(): void {
  lastCache = [];
  lastCacheAt = 0;
}
