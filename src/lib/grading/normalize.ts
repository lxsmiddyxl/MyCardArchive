import type { NormalizeInput } from "@/lib/grading/types";

/** Normalize client/API input before analysis (no network — SSR-safe). */
export function normalizeGradingInput(input: unknown): NormalizeInput {
  if (!input || typeof input !== "object") {
    return {};
  }
  const o = input as Record<string, unknown>;
  return {
    cardId: typeof o.cardId === "string" ? o.cardId : undefined,
    frontImageUrl: typeof o.frontImageUrl === "string" ? o.frontImageUrl : null,
    backImageUrl: typeof o.backImageUrl === "string" ? o.backImageUrl : null,
  };
}
