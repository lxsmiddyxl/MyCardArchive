import "server-only";

export type { DegradationMode, LoadStateLevel } from "@/lib/load/load-types";
export {
  degradationInpProbeScale,
  degradationOverscanScale,
  degradationRegionProbeIntervalMs,
  degradationReduceMotion,
  degradationTelemetryIntervalScale,
  loadStateToDegradation,
} from "@/lib/load/degradation-modes";
export {
  getDegradationMode,
  getLastLoadSnapshot,
  getLastLoadRefreshMs,
  getLoadState,
  getLoadStateRingBuffer,
  refreshLoadState,
  resetLoadStateForTests,
  setDegradationMode,
  setLoadState,
  type LoadStateSnapshot,
} from "@/lib/load/load-state";
export {
  getLoadSheddingFlags,
  isLoadSheddingEnabled,
  registerSheddingRule,
  resetLoadSheddingFlagsForTests,
  runSheddingRules,
  SheddingRegistry,
  type LoadSheddingFlags,
  type SheddingRuleFn,
} from "@/lib/load/load-shedding";
export {
  clearSheddingEventsForTests,
  getRecentSheddingEvents,
  type SheddingEventRecord,
} from "@/lib/load/shedding-events";
