/** Qualitative wave intent for UI + analytics (Phase 65). */
export type ActivityWaveIntent = "browse" | "build" | "trade" | "explore";

/**
 * Map coarse platform band + hour to a qualitative intent (no PII).
 */
export function waveIntentFromBandAndHour(
  band: string | null | undefined,
  utcHour: number
): ActivityWaveIntent {
  const b = band ?? "";
  if (b === "very_active" || b === "active") {
    return utcHour >= 12 && utcHour <= 22 ? "trade" : "build";
  }
  if (b === "steady") return "browse";
  if (b === "quiet" || b === "sleeping") return "explore";
  return "browse";
}

/** Decay strength for a cell age in hours (staleness of cached wave snapshot). */
export function waveSnapshotDecay(ageHours: number): number {
  if (!Number.isFinite(ageHours) || ageHours < 0) return 1;
  return Math.exp(-ageHours / 6);
}
