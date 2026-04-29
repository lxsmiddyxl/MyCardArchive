import "server-only";

import {
  degradationInpProbeScale,
  degradationOverscanScale,
  degradationRegionProbeIntervalMs,
  degradationTelemetryIntervalScale,
} from "@/lib/load/degradation-modes";
import { getDegradationMode } from "@/lib/load/load-state";
import type { LoadStateLevel } from "@/lib/load/load-types";
import { recordSheddingEvent } from "@/lib/load/shedding-events";
import { mcaLog } from "@/lib/logging/mca-log-server";

const CTX = { componentName: "load", surfaceName: "shedding" } as const;

export type LoadSheddingFlags = {
  realtimeCoalesceMs: number;
  telemetryBatchMs: number;
  telemetryMinIntervalMs: number;
  overscanScale: number;
  inpProbeScale: number;
  regionProbeIntervalMs: number;
  skipSecondaryRegionProbes: boolean;
};

let flags: LoadSheddingFlags = {
  realtimeCoalesceMs: 0,
  telemetryBatchMs: 0,
  telemetryMinIntervalMs: 0,
  overscanScale: 1,
  inpProbeScale: 1,
  regionProbeIntervalMs: 30_000,
  skipSecondaryRegionProbes: false,
};

export function getLoadSheddingFlags(): LoadSheddingFlags {
  return { ...flags };
}

export function isLoadSheddingEnabled(): boolean {
  return process.env.LOAD_SHEDDING_ENABLED !== "0";
}

export type SheddingRuleFn = (loadState: LoadStateLevel) => void | Promise<void>;

export const SheddingRegistry = new Map<string, SheddingRuleFn>();

export function registerSheddingRule(name: string, fn: SheddingRuleFn): void {
  SheddingRegistry.set(name, fn);
}

function emit(rule: string, loadState: LoadStateLevel, detail: unknown): void {
  mcaLog.event("loadshedding.trigger", { rule, loadState, detail }, CTX);
  recordSheddingEvent({ rule, loadState, detail });
}

async function realtimeSheddingRule(loadState: LoadStateLevel): Promise<void> {
  if (!isLoadSheddingEnabled()) return;
  const coalesce =
    loadState === "critical" ? 280 : loadState === "high" ? 140 : loadState === "elevated" ? 70 : 0;
  if (flags.realtimeCoalesceMs === coalesce) return;
  flags = { ...flags, realtimeCoalesceMs: coalesce };
  emit("realtimeSheddingRule", loadState, { coalesceMs: coalesce });
}

async function telemetrySheddingRule(loadState: LoadStateLevel): Promise<void> {
  if (!isLoadSheddingEnabled()) return;
  const mode = getDegradationMode();
  const intervalScale = degradationTelemetryIntervalScale(mode);
  const batchMs =
    loadState === "critical" ? 400 : loadState === "high" ? 220 : loadState === "elevated" ? 100 : 0;
  const minInterval = Math.round(50 * intervalScale);
  if (flags.telemetryBatchMs === batchMs && flags.telemetryMinIntervalMs === minInterval) return;
  flags = { ...flags, telemetryBatchMs: batchMs, telemetryMinIntervalMs: minInterval };
  emit("telemetrySheddingRule", loadState, { batchMs, minInterval, intervalScale });
}

async function virtualizationSheddingRule(loadState: LoadStateLevel): Promise<void> {
  if (!isLoadSheddingEnabled()) return;
  const mode = getDegradationMode();
  const scale = degradationOverscanScale(mode);
  if (flags.overscanScale === scale) return;
  flags = { ...flags, overscanScale: scale };
  emit("virtualizationSheddingRule", loadState, { overscanScale: scale });
}

async function uiSheddingRule(loadState: LoadStateLevel): Promise<void> {
  if (!isLoadSheddingEnabled()) return;
  const mode = getDegradationMode();
  const scale = degradationInpProbeScale(mode);
  if (flags.inpProbeScale === scale) return;
  flags = { ...flags, inpProbeScale: scale };
  emit("uiSheddingRule", loadState, { inpProbeScale: scale });
}

async function regionSheddingRule(loadState: LoadStateLevel): Promise<void> {
  if (!isLoadSheddingEnabled()) return;
  const mode = getDegradationMode();
  const interval = degradationRegionProbeIntervalMs(mode);
  const skip = loadState === "high" || loadState === "critical";
  if (flags.regionProbeIntervalMs === interval && flags.skipSecondaryRegionProbes === skip) return;
  flags = { ...flags, regionProbeIntervalMs: interval, skipSecondaryRegionProbes: skip };
  emit("regionSheddingRule", loadState, { regionProbeIntervalMs: interval, skipSecondary: skip });
}

registerSheddingRule("realtimeSheddingRule", realtimeSheddingRule);
registerSheddingRule("telemetrySheddingRule", telemetrySheddingRule);
registerSheddingRule("virtualizationSheddingRule", virtualizationSheddingRule);
registerSheddingRule("uiSheddingRule", uiSheddingRule);
registerSheddingRule("regionSheddingRule", regionSheddingRule);

export async function runSheddingRules(loadState: LoadStateLevel): Promise<void> {
  if (!isLoadSheddingEnabled()) return;
  for (const [name, fn] of SheddingRegistry.entries()) {
    try {
      await fn(loadState);
    } catch (err) {
      mcaLog.warn("loadshedding.rule_failed", { name, err }, CTX);
    }
  }
}

export function resetLoadSheddingFlagsForTests(): void {
  flags = {
    realtimeCoalesceMs: 0,
    telemetryBatchMs: 0,
    telemetryMinIntervalMs: 0,
    overscanScale: 1,
    inpProbeScale: 1,
    regionProbeIntervalMs: 30_000,
    skipSecondaryRegionProbes: false,
  };
}

