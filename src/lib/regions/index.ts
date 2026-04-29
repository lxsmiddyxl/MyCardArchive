import "server-only";

export {
  getActiveRegion,
  getRegionStateSnapshot,
  resetRegionStateForTests,
  setActiveRegion,
} from "@/lib/regions/region-state";
export {
  getAnonKeyForRegion,
  getConfiguredActiveRegion,
  getPrimaryRegion,
  getSecondaryRegion,
  getSiteUrlForRegion,
  getSupabaseUrlForRegion,
  isRegionFailoverEnabled,
} from "@/lib/regions/region-config";
export {
  pingRealtimeForRegion,
  pingSupabaseRestForRegion,
  pingTelemetryForRegion,
  type RegionPingResult,
} from "@/lib/regions/region-health";
