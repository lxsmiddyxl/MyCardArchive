const BADGE_TO_FLAIR: Record<string, string> = {
  identity_influencer: "infl_identity",
  community_influencer: "infl_community",
  expert_influencer: "infl_expert",
  seasonal_influencer: "infl_seasonal",
  collector_influencer: "infl_collector",
};

/** Maps `user_badges.badge_key` where `badge_type === 'influence'` to flair keys. */
export function influenceFlairKeysForBadgeKeys(badgeKeys: string[]): string[] {
  const out: string[] = [];
  for (const raw of badgeKeys) {
    const k = raw?.trim();
    if (!k) continue;
    const fk = BADGE_TO_FLAIR[k];
    if (fk && !out.includes(fk)) out.push(fk);
  }
  return out;
}
