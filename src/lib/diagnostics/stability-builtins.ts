import "server-only";

import "@/lib/diagnostics/region-builtins";
import { registerDiagnostic } from "@/lib/diagnostics/registry";
import { isAutoRecoveryEnabled, runRecovery } from "@/lib/recovery";
import { mcaLog } from "@/lib/logging/mca-log-server";
import {
  getSyntheticInpSnapshot,
  getVirtualizationRegressionSnapshot,
  isStabilityModeEnabled,
} from "@/lib/server/mca-stability-metrics";

const SCTX = { componentName: "diagnostics", surfaceName: "stability" } as const;

async function virtualizationRegressionDiagnostic(): Promise<{ ok: boolean; data?: unknown }> {
  if (!isStabilityModeEnabled()) {
    return {
      ok: true,
      data: { skipped: true, note: "STABILITY_MODE not enabled on server" },
    };
  }
  let snap = getVirtualizationRegressionSnapshot();
  let data: Record<string, unknown> = {
    renderLoops: snap.renderLoops,
    overscanHits: snap.overscanHits,
    unexpectedRerenders: snap.unexpectedRerenders,
    layoutThrashScore: snap.layoutThrashScore,
    stale: snap.stale,
    anomalyScore: snap.anomalyScore,
  };
  let ok = snap.ok;

  if (!ok && !snap.stale && isStabilityModeEnabled() && isAutoRecoveryEnabled()) {
    mcaLog.warn("recovery.trigger", { check: "virtualizationRegressionCheck" }, SCTX);
    const recovery = await runRecovery("virtualizationRecoveryAction", {
      check: "virtualizationRegressionCheck",
    });
    snap = getVirtualizationRegressionSnapshot();
    ok = snap.ok;
    data = {
      renderLoops: snap.renderLoops,
      overscanHits: snap.overscanHits,
      unexpectedRerenders: snap.unexpectedRerenders,
      layoutThrashScore: snap.layoutThrashScore,
      stale: snap.stale,
      anomalyScore: snap.anomalyScore,
      recoveryAttempt: true,
      recovery,
    };
  }

  return { ok, data };
}

async function syntheticInpDiagnostic(): Promise<{ ok: boolean; data?: unknown }> {
  if (!isStabilityModeEnabled()) {
    return { ok: true, data: { skipped: true } };
  }
  const s = getSyntheticInpSnapshot();
  if (s.stale || s.samples === 0) {
    return {
      ok: true,
      data: { lastMs: s.lastMs, samples: s.samples, stale: s.stale, thresholdMs: 500, skipped: true },
    };
  }
  let ok = s.lastMs < 500;
  let data: Record<string, unknown> = {
    lastMs: s.lastMs,
    samples: s.samples,
    stale: false,
    thresholdMs: 500,
  };

  if (!ok && isStabilityModeEnabled() && isAutoRecoveryEnabled()) {
    mcaLog.warn("recovery.trigger", { check: "syntheticInpCheck", lastMs: s.lastMs }, SCTX);
    const recovery = await runRecovery("uiResponsivenessRecoveryAction", {
      check: "syntheticInpCheck",
      lastMs: s.lastMs,
    });
    const s2 = getSyntheticInpSnapshot();
    if (s2.stale || s2.samples === 0) {
      ok = true;
    } else {
      ok = s2.lastMs < 500;
    }
    data = {
      lastMs: s2.lastMs,
      samples: s2.samples,
      stale: s2.stale,
      thresholdMs: 500,
      recoveryAttempt: true,
      recovery,
    };
  }

  return { ok, data };
}

registerDiagnostic("virtualizationRegressionCheck", virtualizationRegressionDiagnostic);
registerDiagnostic("syntheticInpCheck", syntheticInpDiagnostic);

import "@/lib/diagnostics/predictive-stability-builtins";
