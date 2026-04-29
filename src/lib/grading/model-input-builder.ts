import type { GradingRequestEnvelopeV1 } from "@/lib/grading/envelope";
import { GRADING_PIPELINE_VERSION, HEURISTIC_FALLBACK_VERSION } from "@/lib/grading/constants";

/**
 * JSON payload sent to a remote grading model (or worker). Stable keys for ML contracts.
 */
export type GradingModelInputV1 = {
  schema: "mca.grading.model_input/v1";
  pipelineVersion: string;
  fallbackVersion: string;
  cardId: string;
  frontImageUrl: string | null;
  backImageUrl: string | null;
};

export function buildModelInputFromEnvelope(
  envelope: GradingRequestEnvelopeV1
): GradingModelInputV1 {
  return {
    schema: "mca.grading.model_input/v1",
    pipelineVersion: GRADING_PIPELINE_VERSION,
    fallbackVersion: HEURISTIC_FALLBACK_VERSION,
    cardId: envelope.cardId,
    frontImageUrl: envelope.assets?.frontImageUrl ?? null,
    backImageUrl: envelope.assets?.backImageUrl ?? null,
  };
}
