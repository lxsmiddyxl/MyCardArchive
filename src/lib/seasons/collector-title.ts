import type { SeasonId } from "@/lib/seasons/season-catalog";

/**
 * Deterministic “collector title” from coarse signals (no private card names).
 * Mirrors SQL `public._collector_title_from_signals` for display parity.
 */
export function collectorTitleFromSignals(args: {
  dominantSeason?: SeasonId | null;
  topActivity?: string | null;
  favoriteFormatId?: string | null;
  favoriteSetId?: string | null;
}): string {
  const season = args.dominantSeason;
  const fmt = (args.favoriteFormatId ?? "").trim();
  const setId = (args.favoriteSetId ?? "").trim();
  const act = (args.topActivity ?? "").trim();

  if (setId && fmt) {
    return `The ${fmt.toUpperCase()} Set Specialist`;
  }
  if (setId) {
    return "The Set Chaser";
  }
  if (act === "scan") {
    return season === "winter" ? "The Frostbound Scanner" : "The Field Scanner";
  }
  if (act === "binder_complete" || act === "binder_edit") {
    return "The Binder Architect";
  }
  if (act === "set_complete") {
    return "The Master Set Hunter";
  }
  if (fmt) {
    return `The ${fmt} Duelist`;
  }
  return "The Dedicated Collector";
}
