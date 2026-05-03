/** Holo / foil treatment inferred from card art (Scanning v2). */
export type ScanV2HoloStatus = "none" | "reverse_holo" | "holo" | "unknown";

/**
 * Structured output from the vision model (OpenAI vision or stub).
 * Field names are stable for API + persistence.
 */
export type ScanV2VisionPrediction = {
  set_name_guess: string;
  set_code_guess: string;
  card_name_guess: string;
  card_number_guess: string;
  rarity_guess: string;
  holo_status: ScanV2HoloStatus;
  /** Model self-reported certainty for the full prediction (0–1). */
  overall_confidence: number;
  /** Optional short rationale (not shown to users as truth). */
  raw_model_notes?: string;
  provider: "openai_vision" | "stub";
};

export type ScanV2FusionMeta = {
  /** Combined hybrid score used for routing (0–1). */
  fusion_score: number;
  /** Vision/catalog agreement contribution before clamping (0–1). */
  agreement_score?: number;
  /** True when catalog/OCR is authoritative because hybrid score was low. */
  fallback_to_ocr_only: boolean;
  /** Which branch drove Add Card prefills for this scan. */
  decision_source?: "hybrid" | "ocr_catalog";
  /** True when vision agreement meaningfully reinforced the catalog best match. */
  vision_reinforced_catalog: boolean;
};
