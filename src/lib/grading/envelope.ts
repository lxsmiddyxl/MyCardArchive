import type { NormalizeInput } from "@/lib/grading/types";

/**
 * Canonical request envelope for grading (API + future model worker).
 * Versioned so workers can evolve without breaking clients.
 */
export type GradingRequestEnvelopeV1 = {
  version: 1;
  cardId: string;
  /** Optional image URLs for future vision models (currently informational). */
  assets?: {
    frontImageUrl?: string | null;
    backImageUrl?: string | null;
  };
  /** Echo of pipeline feature flags from env (for debugging). */
  requestedModel?: "auto" | "heuristic_only";
};

export function buildGradingRequestEnvelope(
  cardId: string,
  normalized: NormalizeInput,
  opts?: { requestedModel?: GradingRequestEnvelopeV1["requestedModel"] }
): GradingRequestEnvelopeV1 {
  return {
    version: 1,
    cardId: cardId.trim(),
    assets: {
      frontImageUrl: normalized.frontImageUrl ?? null,
      backImageUrl: normalized.backImageUrl ?? null,
    },
    requestedModel: opts?.requestedModel ?? "auto",
  };
}
