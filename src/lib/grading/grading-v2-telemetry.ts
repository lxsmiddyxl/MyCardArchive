import type { GradingPayload } from "@/lib/grading/types";
import { mcaLog } from "@/lib/logging/mca-log-server";

const LOG_CTX = { componentName: "grading", surfaceName: "pipeline.v2" } as const;

/** Server-only: logs v2 grading telemetry when summary fields are present. */
export function logGradingModelV2Telemetry(grade: GradingPayload, cardId: string, traceId?: string): void {
  const s = grade.summary;
  const sub = s.subgrades;
  const hasSub =
    sub.centering != null ||
    sub.corners != null ||
    sub.edges != null ||
    sub.surface != null;
  if (hasSub) {
    mcaLog.event(
      "grading.model.subscores",
      {
        cardId,
        centering: sub.centering,
        corners: sub.corners,
        edges: sub.edges,
        surface: sub.surface,
      },
      { ...LOG_CTX, traceId: traceId ?? cardId }
    );
  }

  if (typeof s.modelConfidence === "number") {
    mcaLog.event(
      "grading.model.confidence",
      { cardId, modelConfidence: s.modelConfidence, dimensionConfidence: s.dimensionConfidence ?? null },
      { ...LOG_CTX, traceId: traceId ?? cardId }
    );
  }

  const explanation = s.explanation;
  const explanationUsed = Boolean(
    explanation &&
      (explanation.tokens.length > 0 ||
        (explanation.regionFlags && Object.keys(explanation.regionFlags).length > 0) ||
        explanation.heatmapHints?.front ||
        explanation.heatmapHints?.back)
  );
  mcaLog.event(
    "grading.model.explanation_used",
    { cardId, explanationUsed, tokenCount: explanation?.tokens.length ?? 0 },
    { ...LOG_CTX, traceId: traceId ?? cardId }
  );
}
