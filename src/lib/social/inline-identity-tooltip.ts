/** Tooltip text for author rows (feed, community, mutuals, recommendations). */
export function buildInlineIdentityProgressTitle(
  journey?: string | null,
  collection?: string | null,
  tradeSummary?: string | null,
  tradeBadgeKey?: string | null,
  extra?: {
    personaText?: string | null;
    valueSummary?: string | null;
    grailSummary?: string | null;
    valueBadgeKey?: string | null;
    rarityProfileLabel?: string | null;
    fandomSummary?: string | null;
    /** Rolling ~7-day activity count from `user_activity_log` (UTC). */
    activityWeekCount?: number | null;
    /** Calendar streak length when streak logging exists or flair exposes streak. */
    activityStreakDays?: number | null;
    /** Last completed season highlight line. */
    seasonHighlight?: string | null;
    /** Preformatted clubs line (display names only). */
    clubsSummary?: string | null;
    /** Qualitative reputation line (no numeric scores). */
    reputationSummary?: string | null;
    /** Qualitative influence line (no numeric scores). */
    influenceSummary?: string | null;
  }
): string | undefined {
  const personaLine = extra?.personaText?.trim();
  const parts = [personaLine, journey?.trim(), collection?.trim()].filter((x): x is string =>
    Boolean(x)
  );
  if (tradeBadgeKey?.trim() && tradeSummary?.trim()) {
    parts.push(tradeSummary.trim());
  }
  const v = extra?.valueSummary?.trim();
  const g = extra?.grailSummary?.trim();
  const vb = extra?.valueBadgeKey?.trim();
  const rp = extra?.rarityProfileLabel?.trim();
  if (vb && v) {
    parts.push(v);
  }
  if (rp) {
    parts.push(`Rarity mix: ${rp}`);
  }
  if (g) {
    parts.push(g);
  }
  const fm = extra?.fandomSummary?.trim();
  if (fm) {
    parts.push(fm);
  }
  const streak = extra?.activityStreakDays;
  if (typeof streak === "number" && streak > 0) {
    parts.push(`Active streak: ${streak} days`);
  }
  const week = extra?.activityWeekCount;
  if (typeof week === "number" && week > 0) {
    parts.push(`Recent activity: ${week} events this week`);
  }
  const sh = extra?.seasonHighlight?.trim();
  if (sh) {
    parts.push(sh);
  }
  const clubs = extra?.clubsSummary?.trim();
  if (clubs) {
    parts.push(clubs);
  }
  const rep = extra?.reputationSummary?.trim();
  if (rep) {
    parts.push(rep);
  }
  const infl = extra?.influenceSummary?.trim();
  if (infl) {
    parts.push(infl);
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}
