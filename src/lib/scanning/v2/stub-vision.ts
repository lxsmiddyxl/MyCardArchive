import "server-only";

import type { ScanV2VisionPrediction } from "@/lib/scanning/v2/vision-types";

export function stubVisionPrediction(reason?: string): ScanV2VisionPrediction {
  return {
    set_name_guess: "",
    set_code_guess: "",
    card_name_guess: "",
    card_number_guess: "",
    rarity_guess: "",
    holo_status: "unknown",
    overall_confidence: 0.06,
    raw_model_notes: reason ?? "Vision model not configured (stub).",
    provider: "stub",
  };
}
