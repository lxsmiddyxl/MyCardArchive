/** Human-readable match strength for catalog suggestions (Scanning v1.5). */
export type ScanMatchConfidenceBand = "strong" | "likely" | "weak";

export function confidenceNumeric(conf: number): number {
  if (!Number.isFinite(conf)) return 0;
  return Math.max(0, Math.min(1, conf));
}

/**
 * Maps internal 0–1 score to a qualitative band for UI copy.
 * Thresholds tuned so RPC top rows usually read as Strong / Likely.
 */
export function confidenceBand(conf: number): ScanMatchConfidenceBand {
  const c = confidenceNumeric(conf);
  if (c >= 0.7) return "strong";
  if (c >= 0.48) return "likely";
  return "weak";
}

export function confidenceBandLabel(band: ScanMatchConfidenceBand): string {
  switch (band) {
    case "strong":
      return "Strong match";
    case "likely":
      return "Likely match";
    default:
      return "Weak match";
  }
}

export function confidenceBandDescription(band: ScanMatchConfidenceBand): string {
  switch (band) {
    case "strong":
      return "OCR and catalog signals line up well — still verify before saving.";
    case "likely":
      return "Plausible catalog hit — check the card image and number.";
    default:
      return "Low confidence — compare to your photo or pick another suggestion.";
  }
}
