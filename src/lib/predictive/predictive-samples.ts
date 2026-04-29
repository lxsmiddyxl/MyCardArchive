import "server-only";

const MAX = 24;

function push(ring: number[], v: number): void {
  ring.push(v);
  if (ring.length > MAX) ring.shift();
}

const realtimeEventAgeMs: number[] = [];
const telemetryStreak: number[] = [];
const virtualizationAnomaly: number[] = [];
const virtualizationOverscan: number[] = [];
const syntheticInpMs: number[] = [];
const regionPrimaryLatencyMs: number[] = [];

export function recordRealtimeEventAgeSample(ageMs: number | null): void {
  if (ageMs === null || !Number.isFinite(ageMs)) return;
  push(realtimeEventAgeMs, Math.max(0, ageMs));
}

export function recordTelemetryStreakSample(streak: number): void {
  if (!Number.isFinite(streak)) return;
  push(telemetryStreak, Math.max(0, Math.floor(streak)));
}

export function recordVirtualizationSamples(anomalyScore: number, overscanHits: number): void {
  if (Number.isFinite(anomalyScore)) push(virtualizationAnomaly, Math.max(0, Math.min(1, anomalyScore)));
  if (Number.isFinite(overscanHits)) push(virtualizationOverscan, Math.max(0, overscanHits));
}

export function recordSyntheticInpSample(lastMs: number): void {
  if (!Number.isFinite(lastMs)) return;
  push(syntheticInpMs, Math.max(0, lastMs));
}

export function recordRegionPrimaryLatencySample(latencyMs: number): void {
  if (!Number.isFinite(latencyMs)) return;
  push(regionPrimaryLatencyMs, Math.max(0, latencyMs));
}

export function getRealtimeAgeSeries(): readonly number[] {
  return realtimeEventAgeMs;
}

export function getTelemetryStreakSeries(): readonly number[] {
  return telemetryStreak;
}

export function getVirtualizationAnomalySeries(): readonly number[] {
  return virtualizationAnomaly;
}

export function getVirtualizationOverscanSeries(): readonly number[] {
  return virtualizationOverscan;
}

export function getSyntheticInpSeries(): readonly number[] {
  return syntheticInpMs;
}

export function getRegionPrimaryLatencySeries(): readonly number[] {
  return regionPrimaryLatencyMs;
}

export function sparklineFromSeries(series: readonly number[], maxPoints = 12): number[] {
  if (series.length === 0) return [];
  const slice = series.slice(-maxPoints);
  return slice.map((n) => Math.round(n * 100) / 100);
}

/** Test-only reset. */
export function resetPredictiveSamplesForTests(): void {
  realtimeEventAgeMs.length = 0;
  telemetryStreak.length = 0;
  virtualizationAnomaly.length = 0;
  virtualizationOverscan.length = 0;
  syntheticInpMs.length = 0;
  regionPrimaryLatencyMs.length = 0;
}
