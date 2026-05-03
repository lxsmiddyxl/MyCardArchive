import type { ScanV25QualBand } from "@/lib/scanning/v2_5/types";

export function scanV25ConfidenceBand(score: number): ScanV25QualBand {
  if (score >= 0.72) return "strong";
  if (score >= 0.45) return "likely";
  return "weak";
}
