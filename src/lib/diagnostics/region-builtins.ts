import "server-only";

import { registerDiagnostic } from "@/lib/diagnostics/registry";
import { checkRegionHealth } from "@/lib/failover/failover-engine";
import { getSecondaryRegion, isRegionFailoverEnabled } from "@/lib/regions/region-config";
import { getActiveRegion } from "@/lib/regions/region-state";
import { isAutoRecoveryEnabled, runRecovery } from "@/lib/recovery";
import { mcaLog } from "@/lib/logging/mca-log-server";

const RCTX = { componentName: "diagnostics", surfaceName: "region" } as const;

async function regionHealthCheck(): Promise<{ ok: boolean; data?: unknown }> {
  const health = await checkRegionHealth();
  const data: Record<string, unknown> = { regionHealth: health };

  if (!health.primary.ok) {
    if (isRegionFailoverEnabled() && isAutoRecoveryEnabled()) {
      mcaLog.warn("recovery.trigger", { check: "regionHealthCheck" }, RCTX);
      const recovery = await runRecovery("regionFailoverAction", {
        check: "regionHealthCheck",
        regionHealth: health,
      });
      return {
        ok: false,
        data: { ...data, recoveryAttempt: true, recovery },
      };
    }
    return { ok: false, data };
  }

  return { ok: true, data };
}

async function regionFailbackCheck(): Promise<{ ok: boolean; data?: unknown }> {
  const health = await checkRegionHealth();
  const secondary = getSecondaryRegion();
  const active = getActiveRegion();
  const data: Record<string, unknown> = { regionHealth: health };

  if (!secondary) {
    return { ok: true, data: { ...data, skipped: true, reason: "no_secondary" } };
  }

  const needsFailback = health.primary.ok && active === secondary;

  if (!needsFailback) {
    return { ok: true, data };
  }

  if (!isRegionFailoverEnabled() || !isAutoRecoveryEnabled()) {
    return {
      ok: false,
      data: { ...data, skipped: true, reason: "failover_or_recovery_disabled" },
    };
  }

  mcaLog.warn("recovery.trigger", { check: "regionFailbackCheck" }, RCTX);
  const recovery = await runRecovery("regionFailbackAction", {
    check: "regionFailbackCheck",
    regionHealth: health,
  });
  return {
    ok: recovery.recovered,
    data: { ...data, recoveryAttempt: true, recovery },
  };
}

registerDiagnostic("regionHealthCheck", regionHealthCheck);
registerDiagnostic("regionFailbackCheck", regionFailbackCheck);
