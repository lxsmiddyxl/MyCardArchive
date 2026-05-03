/** Qualitative copy — no numeric counts (Phase 27). */

export type ActivityWaveBand =
  | "very_active"
  | "active"
  | "steady"
  | "quiet"
  | "sleeping";

const DISPLAY: Record<ActivityWaveBand, string> = {
  very_active: "Very active",
  active: "Active",
  steady: "Steady",
  quiet: "Quiet",
  sleeping: "Sleeping hours",
};

export function waveBandToDisplayLabel(band: string | null | undefined): string {
  if (!band || !(band in DISPLAY)) return "Quiet hour";
  return DISPLAY[band as ActivityWaveBand];
}

/** Pulse headline — softer phrasing for seasonal shell. */
export function waveBandToPulseHeadline(band: string | null | undefined): string {
  switch (band as ActivityWaveBand) {
    case "very_active":
      return "High seasonal pulse";
    case "active":
      return "Warm participation";
    case "steady":
      return "Steady drumbeat";
    case "quiet":
      return "Quiet stretch";
    case "sleeping":
      return "Soft lull";
    default:
      return "Seasonal rhythm";
  }
}

/** Platform-wide headline from current bucket (UTC). */
export function platformHeadlineFromBand(band: string | null | undefined): string {
  switch (band as ActivityWaveBand) {
    case "very_active":
      return "High activity";
    case "active":
      return "Busy stretch";
    case "steady":
      return "Steady rhythm";
    case "quiet":
      return "Quiet hour";
    case "sleeping":
      return "Quiet hours";
    default:
      return "Quiet hour";
  }
}
