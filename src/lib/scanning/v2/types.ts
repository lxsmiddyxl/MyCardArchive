/**
 * Scanning v2 — model-based recognition + hybrid fusion with OCR v1.5.
 */

/** Client → server (reserved for future structured hints). */
export type ScanV2RecognizeRequest = {
  client_request_id?: string;
  async?: boolean;
  capture_hints?: Record<string, unknown>;
};

/** Legacy not-implemented shape (unused when POST succeeds). */
export type ScanV2RecognizeNotImplemented = {
  status: "not_implemented";
  message: string;
  contract_version: 1;
};

export type ScanV2Capability =
  | "bbox_detection"
  | "template_match"
  | "multiview_fusion"
  | "openai_vision"
  | "visual_intel_v2_5";

export type ScanV2CapabilitiesPayload = {
  scanning_v2: {
    enabled: boolean;
    capabilities: ScanV2Capability[];
    message: string;
    contract_version: 1;
    /** Hint only — server uses env at request time. */
    default_model?: string;
  };
};
