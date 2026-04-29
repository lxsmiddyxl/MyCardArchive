import "server-only";

import { monitorEventLoopDelay } from "node:perf_hooks";
import { checkRegionHealth } from "@/lib/failover/failover-engine";
import { loadStateToDegradation } from "@/lib/load/degradation-modes";
import type { DegradationMode, LoadStateLevel } from "@/lib/load/load-types";
import { highestSeverityFromPredictions, isPredictiveModeEnabled, runPredictors } from "@/lib/predictive/predictive-engine";
import { getVirtualizationRegressionSnapshot } from "@/lib/server/mca-stability-metrics";
import { getIngestBackoffState } from "@/lib/server/telemetry-ingest-backoff";

let degradationOverride: DegradationMode | null = null;

const RING_MAX = 24;

export type LoadStateSnapshot = {
  cpuUserMicros: number;
  memoryHeapMb: number;
  eventLoopLagMs: number;
  rafJitterProxy: number;
  regionLatencyMs: number;
  ingestBackoffStreak: number;
  predictiveHighest: string;
  ts: number;
};

const ring: LoadStateSnapshot[] = [];
let lastCpu = process.cpuUsage();

let elMonitor: ReturnType<typeof monitorEventLoopDelay> | null = null;
function ensureElMonitor(): ReturnType<typeof monitorEventLoopDelay> {
  if (!elMonitor) {
    const m = monitorEventLoopDelay({ resolution: 20 });
    m.enable();
    elMonitor = m;
  }
  return elMonitor;
}

function readEventLoopLagMs(): number {
  try {
    const m = ensureElMonitor();
    return m.mean / 1e6;
  } catch {
    return 0;
  }
}

function thresholdElevated(): number {
  const t = Number(process.env.LOAD_SHEDDING_THRESHOLD?.trim());
  return Number.isFinite(t) && t > 0 ? t : 80;
}

function thresholdHigh(): number {
  return thresholdElevated() * 3.5;
}

function thresholdCritical(): number {
  return thresholdElevated() * 7;
}

let memoryLoadLevel: LoadStateLevel = "normal";
let lastRefresh = 0;
let lastSnapshot: LoadStateSnapshot | null = null;

function pushRing(s: LoadStateSnapshot): void {
  ring.push(s);
  if (ring.length > RING_MAX) ring.shift();
}

function maxSeverity(a: LoadStateLevel, b: LoadStateLevel): LoadStateLevel {
  const order: LoadStateLevel[] = ["normal", "elevated", "high", "critical"];
  return order[Math.max(order.indexOf(a), order.indexOf(b))] ?? "normal";
}

function scoreFromSignals(s: Partial<LoadStateSnapshot>): LoadStateLevel {
  const te = thresholdElevated();
  const th = thresholdHigh();
  const tc = thresholdCritical();

  let level: LoadStateLevel = "normal";

  const lag = s.eventLoopLagMs ?? 0;
  if (lag >= tc) level = maxSeverity(level, "critical");
  else if (lag >= th) level = maxSeverity(level, "high");
  else if (lag >= te) level = maxSeverity(level, "elevated");

  const jitter = s.rafJitterProxy ?? 0;
  if (jitter >= 12) level = maxSeverity(level, "high");
  else if (jitter >= 6) level = maxSeverity(level, "elevated");

  const reg = s.regionLatencyMs ?? 0;
  if (reg >= 2500) level = maxSeverity(level, "high");
  else if (reg >= 1200) level = maxSeverity(level, "elevated");

  const streak = s.ingestBackoffStreak ?? 0;
  if (streak >= 6) level = maxSeverity(level, "high");
  else if (streak >= 3) level = maxSeverity(level, "elevated");

  if (s.predictiveHighest === "critical") level = maxSeverity(level, "critical");
  else if (s.predictiveHighest === "warn") level = maxSeverity(level, "elevated");

  return level;
}

export function getLoadState(): LoadStateLevel {
  return memoryLoadLevel;
}

export function setLoadState(level: LoadStateLevel): void {
  memoryLoadLevel = level;
}

export function getDegradationMode(): DegradationMode {
  const o = process.env.LOAD_DEGRADATION_MODE_OVERRIDE?.trim();
  if (
    o === "degrade:none" ||
    o === "degrade:light" ||
    o === "degrade:medium" ||
    o === "degrade:severe"
  ) {
    return o;
  }
  if (degradationOverride) return degradationOverride;
  return loadStateToDegradation(getLoadState());
}

/** Runtime override (e.g. drills). Cleared with `null`. Env `LOAD_DEGRADATION_MODE_OVERRIDE` wins when set. */
export function setDegradationMode(mode: DegradationMode | null): void {
  degradationOverride = mode;
}

export function getLoadStateRingBuffer(): readonly LoadStateSnapshot[] {
  return [...ring];
}

export function getLastLoadSnapshot(): LoadStateSnapshot | null {
  return lastSnapshot;
}

export async function refreshLoadState(): Promise<{
  level: LoadStateLevel;
  snapshot: LoadStateSnapshot;
}> {
  const cpu = process.cpuUsage(lastCpu);
  lastCpu = process.cpuUsage();

  const heapMb = process.memoryUsage().heapUsed / (1024 * 1024);
  const eventLoopLagMs = readEventLoopLagMs();

  const virt = getVirtualizationRegressionSnapshot();
  const rafJitterProxy = virt.stale ? 0 : virt.layoutThrashScore;

  const { streak } = getIngestBackoffState();

  let regionLatencyMs = 0;
  try {
    const health = await checkRegionHealth();
    const pr = health.primary.supabaseRest;
    const prt = health.primary.realtime;
    const pt = health.primary.telemetry;
    regionLatencyMs = Math.max(pr.latencyMs, prt.latencyMs, pt.latencyMs);
  } catch {
    regionLatencyMs = 9999;
  }

  let predictiveHighest = "none";
  if (isPredictiveModeEnabled()) {
    try {
      const preds = await runPredictors();
      predictiveHighest = highestSeverityFromPredictions(preds);
    } catch {
      predictiveHighest = "warn";
    }
  }

  const snapshot: LoadStateSnapshot = {
    cpuUserMicros: cpu.user,
    memoryHeapMb: Math.round(heapMb * 100) / 100,
    eventLoopLagMs: Math.round(eventLoopLagMs * 100) / 100,
    rafJitterProxy: Math.round(rafJitterProxy * 100) / 100,
    regionLatencyMs: Math.round(regionLatencyMs * 100) / 100,
    ingestBackoffStreak: streak,
    predictiveHighest,
    ts: Date.now(),
  };

  lastSnapshot = snapshot;
  pushRing(snapshot);
  lastRefresh = snapshot.ts;

  const level = scoreFromSignals(snapshot);
  memoryLoadLevel = level;

  return { level, snapshot };
}

export function getLastLoadRefreshMs(): number {
  return lastRefresh;
}

export function resetLoadStateForTests(): void {
  memoryLoadLevel = "normal";
  lastSnapshot = null;
  ring.length = 0;
  lastRefresh = 0;
  lastCpu = process.cpuUsage();
  degradationOverride = null;
}
