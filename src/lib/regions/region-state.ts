import "server-only";

import {
  getConfiguredActiveRegion,
  getPrimaryRegion,
  getSecondaryRegion,
  isRegionFailoverEnabled,
} from "@/lib/regions/region-config";

/** In-memory active region (overrides env when failover runs in-process). */
let memoryActiveRegion: string | null = null;

export function getActiveRegion(): string {
  return memoryActiveRegion ?? getConfiguredActiveRegion();
}

/**
 * Server-only: switch logical active region. No-op if failover disabled.
 * Real traffic still follows deploy env until all clients read this via APIs / future routing.
 */
export function setActiveRegion(region: string): boolean {
  if (!isRegionFailoverEnabled()) return false;
  const primary = getPrimaryRegion();
  const secondary = getSecondaryRegion();
  if (!secondary && region !== primary) return false;
  if (region !== primary && region !== secondary) return false;
  memoryActiveRegion = region;
  return true;
}

export function getRegionStateSnapshot(): {
  activeRegion: string;
  memoryOverride: string | null;
  primaryRegion: string;
  secondaryRegion: string;
  failoverEnabled: boolean;
} {
  return {
    activeRegion: getActiveRegion(),
    memoryOverride: memoryActiveRegion,
    primaryRegion: getPrimaryRegion(),
    secondaryRegion: getSecondaryRegion(),
    failoverEnabled: isRegionFailoverEnabled(),
  };
}

export function resetRegionStateForTests(): void {
  memoryActiveRegion = null;
}
