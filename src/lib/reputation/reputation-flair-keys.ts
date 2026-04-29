const BADGE_TO_FLAIR: Record<string, string> = {
  helpful_collector: "rep_helpful",
  expert_collector: "rep_expert",
  positive_contributor: "rep_positive",
  reliable_collector: "rep_reliable",
  community_pillar: "rep_pillar",
};

/** Maps `user_badges.badge_key` where `badge_type === 'reputation'` to flair keys. */
export function reputationFlairKeysForBadgeKeys(badgeKeys: string[]): string[] {
  const out: string[] = [];
  for (const raw of badgeKeys) {
    const k = raw?.trim();
    if (!k) continue;
    const fk = BADGE_TO_FLAIR[k];
    if (fk && !out.includes(fk)) out.push(fk);
  }
  return out;
}
