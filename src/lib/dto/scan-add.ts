import type { NormalizedCard } from "@/lib/ai/normalize-card";
import type { ScanV1ExtractedText } from "@/lib/scanning/types";
import type { ScanV2FusionMeta, ScanV2VisionPrediction } from "@/lib/scanning/v2/vision-types";
import type { ScanV25VisualIntel } from "@/lib/scanning/v2_5/types";
import type { ScanRankingResult } from "@/lib/scanning/phase3/types";
import type { AutoMatchCandidate, AutoMatchResult } from "@/lib/types/auto-match";

/** Catalog row from auto-match (stable alias for scan UI + API shapes). */
export type ScanCandidateDTO = AutoMatchCandidate;

/** Legacy `POST /api/scan` success body. */
export type ScanResultDTO = {
  success: true;
  card: NormalizedCard;
  scan_event_id: string;
  raw_ai: unknown;
  auto_match?: AutoMatchResult;
};

/** Partial error body when legacy scan returns HTTP error but embeds a partial success payload. */
export type ScanLegacyErrorBodyDTO = {
  error?: string;
  code?: string;
  success?: false;
  scan_event_id?: string;
  raw_ai?: unknown;
  card?: NormalizedCard;
  auto_match?: AutoMatchResult;
};

/** `POST /api/scan/v2` success body. */
export type ScanV2PipelineSuccessDTO = {
  success: true;
  scan_pipeline: string;
  card: NormalizedCard;
  scan_event_id: string;
  extracted: ScanV1ExtractedText;
  auto_match: AutoMatchResult;
  ranking: ScanRankingResult;
  ocr_v1_5: { extracted: ScanV1ExtractedText; auto_match: AutoMatchResult };
  vision_model: ScanV2VisionPrediction;
  fusion: ScanV2FusionMeta;
  visual_intel?: ScanV25VisualIntel;
  visual_intel_degraded?: boolean;
  raw_ai: null;
  had_back_image?: boolean;
};

export type ScanHistoryEntryDTO = {
  id: string;
  image_url: string | null;
  best_catalog_card_id: string | null;
  confidence: number;
  scan_event_id: string | null;
  created_at: string;
  card_name?: string | null;
  set_name?: string | null;
  number?: string | null;
};

export type ScanBatchResultItemDTO = {
  region_index: number;
  scan_event_id: string;
  ranking: ScanRankingResult;
  card: NormalizedCard;
  auto_match: AutoMatchResult;
};

export type ScanBatchSuccessDTO = {
  success: true;
  results: ScanBatchResultItemDTO[];
};

/** `POST /api/scan/v1` (text OCR) success body. */
export type ScanTextPipelineSuccessDTO = {
  success: true;
  scan_pipeline: "text_ocr_v1" | "text_ocr_v1_5";
  card: NormalizedCard;
  scan_event_id: string;
  extracted: ScanV1ExtractedText;
  auto_match: AutoMatchResult;
  raw_ai: null;
  had_back_image?: boolean;
};

/** `POST /api/cards` JSON body when adding from scan or manual add-card. */
export type AddCardToBinderDTO = {
  binder_id: string;
  name: string;
  number: string | null;
  rarity: string | null;
  image_url?: string | null;
  scan_event_id?: string;
  catalog_card_id?: string;
  set_name?: string | null;
};

/** Typical success payload from `POST /api/cards`. */
export type BinderAddMutationResponseDTO = {
  card: { id: string };
};
