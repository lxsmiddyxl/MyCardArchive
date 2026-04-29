/**
 * Card grading: model-ready pipeline with heuristic fallback.
 * @see docs/grading/PIPELINE.md
 */

import { buildHeuristicGradingPayload } from "./heuristic";

export { GRADING_PIPELINE_VERSION, HEURISTIC_FALLBACK_VERSION } from "./constants";
/** @deprecated Use HEURISTIC_FALLBACK_VERSION — kept for older imports. */
export { HEURISTIC_FALLBACK_VERSION as HEURISTIC_MODEL_VERSION } from "./constants";

export { normalizeGradingInput } from "./normalize";
export { buildGradingRequestEnvelope, type GradingRequestEnvelopeV1 } from "./envelope";
export { buildModelInputFromEnvelope, type GradingModelInputV1 } from "./model-input-builder";
export { validateModelOutput, describeValidationFailure } from "./model-output-validator";
export { runGradingPipeline, type GradingPipelineResult } from "./pipeline";

export {
  analyzeCardFront,
  analyzeCardBack,
  computeGradeSummary,
  buildHeuristicGradingPayload,
} from "./heuristic";

/** @deprecated Use {@link buildHeuristicGradingPayload} or {@link runGradingPipeline}. */
export function buildGradingPayload(
  cardId: string,
  input: import("./types").NormalizeInput
): import("./types").GradingPayload {
  return buildHeuristicGradingPayload(cardId, input);
}

export type {
  GradeSummary,
  GradingPayload,
  GradingSideAnalysis,
  NormalizeInput,
} from "./types";
