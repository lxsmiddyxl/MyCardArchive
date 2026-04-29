import "server-only";

import { registerDiagnostic } from "@/lib/diagnostics/registry";
import { runSheddingRules } from "@/lib/load/load-shedding";
import { setLoadState } from "@/lib/load/load-state";
import { mcaLog } from "@/lib/logging/mca-log-server";
import {
  isPredictiveModeEnabled,
  predictorRecoveryActionName,
  runPredictors,
} from "@/lib/predictive/predictive-engine";
import { isAutoRecoveryEnabled, runRecovery } from "@/lib/recovery";
import { isRegionFailoverEnabled } from "@/lib/regions/region-config";

const CTX = { componentName: "diagnostics", surfaceName: "predictive_recovery" } as const;

async function predictiveAutoHealCheck(): Promise<{ ok: boolean; data?: unknown }> {
  if (!isPredictiveModeEnabled()) {
    return {
      ok: true,
      data: { skipped: true, note: "PREDICTIVE_MODE=0" },
    };
  }

  const predictions = await runPredictors();
  const critical = predictions.filter((p) => p.severity === "critical");

  if (critical.length > 0) {
    setLoadState("critical");
    await runSheddingRules("critical");
  }

  const recoveries: Array<{
    predictor: string;
    action: string;
    result: Awaited<ReturnType<typeof runRecovery>>;
  }> = [];

  if (critical.length > 0 && isAutoRecoveryEnabled()) {
    for (const p of critical) {
      if (p.name === "regionHealthPredictor" && !isRegionFailoverEnabled()) {
        continue;
      }
      const action = predictorRecoveryActionName(p.name);
      if (!action) continue;

      mcaLog.warn(
        "recovery.trigger",
        { check: "predictiveAutoHealCheck", predictor: p.name, action },
        CTX
      );
      const result = await runRecovery(action, {
        check: "predictiveAutoHealCheck",
        predictor: p.name,
        predictiveTrigger: true,
        recoveryAttempt: true,
      });
      recoveries.push({ predictor: p.name, action, result });
    }
  }

  const recoveryAttempt = recoveries.length > 0;
  const healed = recoveries.some((r) => r.result.recovered);
  const ok = critical.length === 0 || (recoveryAttempt && healed);

  return {
    ok,
    data: {
      predictions,
      criticalPredictors: critical.map((c) => c.name),
      recoveryAttempt,
      recoveries,
    },
  };
}

registerDiagnostic("predictiveAutoHealCheck", predictiveAutoHealCheck);
