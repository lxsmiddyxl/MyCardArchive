import type { ScanV2CapabilitiesPayload, ScanV2Capability } from "@/lib/scanning/v2/types";

const CAPS: ScanV2Capability[] = [
  "bbox_detection",
  "template_match",
  "multiview_fusion",
  "openai_vision",
  "visual_intel_v2_5",
];

function visionConfigured(): boolean {
  return Boolean(
    process.env.SCAN_V2_OPENAI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()
  );
}

export function scanV2CapabilitiesPayload(): ScanV2CapabilitiesPayload {
  const enabled = visionConfigured();
  return {
    scanning_v2: {
      enabled,
      capabilities: CAPS,
      message: enabled
        ? "Scanning v2.5 hybrid: vision + OCR + catalog fusion, plus on-device holo, rarity, centering, and surface heuristics when the image decodes (Sharp). POST /api/scan/v2 with multipart image."
        : "Set SCAN_V2_OPENAI_API_KEY or OPENAI_API_KEY to enable vision inference; OCR + catalog and v2.5 image heuristics still run where possible.",
      contract_version: 1,
      default_model: process.env.SCAN_V2_VISION_MODEL?.trim() || "gpt-4o-mini",
    },
  };
}
