import "server-only";

import { registerDiagnostic } from "@/lib/diagnostics/registry";
import {
  highestSeverityFromPredictions,
  isPredictiveModeEnabled,
  runPredictors,
} from "@/lib/predictive/predictive-engine";

async function predictiveSnapshotCheck(): Promise<{ ok: boolean; data?: unknown }> {
  if (!isPredictiveModeEnabled()) {
    return {
      ok: true,
      data: {
        skipped: true,
        predictions: [],
        highestSeverity: "none",
        note: "PREDICTIVE_MODE=0",
      },
    };
  }
  const predictions = await runPredictors();
  const highestSeverity = highestSeverityFromPredictions(predictions);
  const ok = !predictions.some((p) => p.severity === "critical");
  return {
    ok,
    data: {
      predictions,
      highestSeverity,
    },
  };
}

registerDiagnostic("predictiveSnapshotCheck", predictiveSnapshotCheck);
