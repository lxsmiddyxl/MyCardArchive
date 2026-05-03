import type { NormalizedCard } from "@/lib/ai/normalize-card";
import type { ScanV25Pipeline, ScanV25VisualIntel } from "@/lib/scanning/v2_5/types";
import type { ScanV2FusionMeta, ScanV2VisionPrediction } from "@/lib/scanning/v2/vision-types";
import type { AutoMatchResult } from "@/lib/types/auto-match";

/** OCR + heuristics output before catalog matching (Scanning v1). */
export type ScanV1ExtractedText = {
  raw_ocr: string;
  /** Best-effort Pokémon card name from OCR layout. */
  name_guess: string;
  /** Collector number only (e.g. "4" from "4/102"). */
  number_guess: string;
  /** Printed set code token if detected (e.g. BASE, JU). */
  set_code_guess: string;
  /** Non-empty trimmed lines kept for debugging / future models. */
  lines: string[];
};

/** Persisted under `scan_events.raw_text` for text-OCR pipeline. */
export type ScanTextV1PersistedPayload = {
  version: 1;
  pipeline: "text_ocr_v1" | "text_ocr_v1_5";
  extracted: ScanV1ExtractedText;
  auto_match: AutoMatchResult;
  normalized: NormalizedCard;
};

/** API JSON shape returned by POST `/api/scan/v1`. */
export type ScanTextV1ApiSuccess = {
  success: true;
  scan_pipeline: "text_ocr_v1" | "text_ocr_v1_5";
  card: NormalizedCard;
  scan_event_id: string;
  extracted: ScanV1ExtractedText;
  auto_match: AutoMatchResult;
  raw_ai: null;
};

/** Persisted for POST `/api/scan/v2` (hybrid model + OCR). */
export type ScanV2PersistedPayload = {
  version: 2;
  pipeline: "scan_v2_hybrid" | "scan_v2_ocr_fallback";
  auto_match: AutoMatchResult;
  normalized: NormalizedCard;
  ocr_v1_5: {
    extracted: ScanV1ExtractedText;
    auto_match: AutoMatchResult;
  };
  vision_model: ScanV2VisionPrediction;
  fusion: ScanV2FusionMeta;
};

/** Persisted for POST `/api/scan/v2` when image heuristics succeed (extends v2 fields). */
export type ScanV25PersistedPayload = {
  version: 2.5;
  pipeline: ScanV25Pipeline;
  auto_match: AutoMatchResult;
  normalized: NormalizedCard;
  ocr_v1_5: {
    extracted: ScanV1ExtractedText;
    auto_match: AutoMatchResult;
  };
  vision_model: ScanV2VisionPrediction;
  fusion: ScanV2FusionMeta;
  visual_intel: ScanV25VisualIntel;
  /** True when the image was small or border metrics were unreliable — treat hints as exploratory. */
  visual_intel_degraded?: boolean;
};
