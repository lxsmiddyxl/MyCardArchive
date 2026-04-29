import "server-only";

import { runFailoverActions } from "@/lib/failover/failover-actions";
import { mcaLog } from "@/lib/logging/mca-log-server";
import {
  getPrimaryRegion,
  getSecondaryRegion,
  isRegionFailoverEnabled,
} from "@/lib/regions/region-config";
import { getActiveRegion } from "@/lib/regions/region-state";
import type { RegionPingResult } from "@/lib/regions/region-health";
import {
  pingRealtimeForRegion,
  pingSupabaseRestForRegion,
  pingTelemetryForRegion,
} from "@/lib/regions/region-health";

const CTX = { componentName: "failover", surfaceName: "engine" } as const;

export type RegionHealthBundle = {
  region: string;
  supabaseRest: RegionPingResult;
  realtime: RegionPingResult;
  telemetry: RegionPingResult;
  ok: boolean;
};

export type CheckRegionHealthResult = {
  primary: RegionHealthBundle;
  secondary: RegionHealthBundle | { configured: false };
  timestamp: number;
};

export function isSecondaryRegionConfigured(
  health: CheckRegionHealthResult
): health is CheckRegionHealthResult & { secondary: RegionHealthBundle } {
  return "region" in health.secondary;
}

function bundleOk(b: {
  supabaseRest: RegionPingResult;
  realtime: RegionPingResult;
  telemetry: RegionPingResult;
}): boolean {
  return b.supabaseRest.ok && b.realtime.ok && b.telemetry.ok;
}

export async function checkRegionHealth(): Promise<CheckRegionHealthResult> {
  const primary = getPrimaryRegion();
  const secondary = getSecondaryRegion();
  const pr = await pingSupabaseRestForRegion(primary);
  const prt = await pingRealtimeForRegion(primary);
  const ptel = await pingTelemetryForRegion(primary);
  const primaryBundle: RegionHealthBundle = {
    region: primary,
    supabaseRest: pr,
    realtime: prt,
    telemetry: ptel,
    ok: bundleOk({ supabaseRest: pr, realtime: prt, telemetry: ptel }),
  };

  if (!secondary) {
    return { primary: primaryBundle, secondary: { configured: false }, timestamp: Date.now() };
  }

  const sr = await pingSupabaseRestForRegion(secondary);
  const srt = await pingRealtimeForRegion(secondary);
  const stel = await pingTelemetryForRegion(secondary);
  const secondaryBundle: RegionHealthBundle = {
    region: secondary,
    supabaseRest: sr,
    realtime: srt,
    telemetry: stel,
    ok: bundleOk({ supabaseRest: sr, realtime: srt, telemetry: stel }),
  };

  return {
    primary: primaryBundle,
    secondary: secondaryBundle,
    timestamp: Date.now(),
  };
}

export function shouldFailover(health: CheckRegionHealthResult): boolean {
  if (!isRegionFailoverEnabled()) return false;
  if (!isSecondaryRegionConfigured(health)) return false;
  return !health.primary.ok && health.secondary.ok;
}

export function shouldFailback(health: CheckRegionHealthResult): boolean {
  if (!isRegionFailoverEnabled()) return false;
  if (!isSecondaryRegionConfigured(health)) return false;
  const secondary = getSecondaryRegion();
  if (!secondary) return false;
  return getActiveRegion() === secondary && health.primary.ok;
}

export async function performFailover(): Promise<{
  ok: boolean;
  success: boolean;
  data?: unknown;
}> {
  if (!isRegionFailoverEnabled()) {
    return { ok: false, success: false, data: { reason: "failover_disabled" } };
  }
  const secondary = getSecondaryRegion();
  if (!secondary) {
    return { ok: false, success: false, data: { reason: "no_secondary_region" } };
  }

  const health = await checkRegionHealth();
  if (getActiveRegion() === secondary) {
    return {
      ok: true,
      success: true,
      data: { idempotent: true, activeRegion: secondary, health },
    };
  }
  if (!shouldFailover(health)) {
    return { ok: true, success: false, data: { reason: "failover_conditions_not_met", health } };
  }

  try {
    mcaLog.event("failover.start", { phase: "failover", target: secondary, from: getPrimaryRegion() }, CTX);
    mcaLog.event(
      "region.failover.start",
      { target: secondary, from: getPrimaryRegion() },
      CTX
    );
    await runFailoverActions({ phase: "failover" });
    mcaLog.event(
      "failover.complete",
      { phase: "failover", activeRegion: getActiveRegion() },
      CTX
    );
    mcaLog.event(
      "region.failover.success",
      { activeRegion: getActiveRegion(), phase: "failover" },
      CTX
    );
    return { ok: true, success: true, data: { activeRegion: getActiveRegion(), health } };
  } catch (err) {
    mcaLog.event(
      "failover.failed",
      { phase: "failover", err: err instanceof Error ? err.message : String(err) },
      CTX
    );
    return { ok: false, success: false, data: { reason: "exception", err: String(err) } };
  }
}

export async function performFailback(): Promise<{
  ok: boolean;
  success: boolean;
  data?: unknown;
}> {
  if (!isRegionFailoverEnabled()) {
    return { ok: false, success: false, data: { reason: "failover_disabled" } };
  }
  const primary = getPrimaryRegion();
  const health = await checkRegionHealth();
  if (getActiveRegion() === primary) {
    return {
      ok: true,
      success: true,
      data: { idempotent: true, activeRegion: primary, health },
    };
  }
  if (!shouldFailback(health)) {
    return { ok: true, success: false, data: { reason: "failback_conditions_not_met", health } };
  }

  try {
    mcaLog.event("failover.start", { phase: "failback", target: primary }, CTX);
    mcaLog.event(
      "region.failover.start",
      { target: primary, phase: "failback" },
      CTX
    );
    await runFailoverActions({ phase: "failback" });
    mcaLog.event(
      "failover.complete",
      { phase: "failback", activeRegion: getActiveRegion() },
      CTX
    );
    mcaLog.event(
      "region.failover.rollback",
      { activeRegion: getActiveRegion(), phase: "failback" },
      CTX
    );
    return { ok: true, success: true, data: { activeRegion: getActiveRegion(), health } };
  } catch (err) {
    mcaLog.event(
      "failover.failed",
      { phase: "failback", err: err instanceof Error ? err.message : String(err) },
      CTX
    );
    return { ok: false, success: false, data: { reason: "exception", err: String(err) } };
  }
}
