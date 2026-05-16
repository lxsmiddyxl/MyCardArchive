import type { BinderInsights } from "@/mca-utils/binders/binder-insights-types";

export type BinderProfileStats = {
  total_cards: number;
  unique_cards: number;
  sets_represented: number;
  binder_count: number;
  variant_total: number;
  badges: string[];
};

export function computeBinderBadges(stats: {
  total_cards: number;
  sets_represented: number;
  binder_count: number;
  max_set_percent: number;
}): string[] {
  const badges: string[] = [];
  if (stats.total_cards >= 100) badges.push("Century collector");
  if (stats.total_cards >= 500) badges.push("Vault keeper");
  if (stats.sets_represented >= 5) badges.push("Set explorer");
  if (stats.sets_represented >= 15) badges.push("Set master");
  if (stats.binder_count >= 3) badges.push("Multi-binder");
  if (stats.max_set_percent >= 100) badges.push("Set complete");
  else if (stats.max_set_percent >= 75) badges.push("Near complete");
  return badges;
}

export function aggregateProfileStats(input: {
  binderCount: number;
  insightsList: Array<BinderInsights | null>;
}): BinderProfileStats {
  let total_cards = 0;
  let unique_cards = 0;
  let sets_represented = 0;
  let variant_total = 0;
  let max_set_percent = 0;

  for (const insights of input.insightsList) {
    if (!insights) continue;
    total_cards += insights.overview.total_cards;
    unique_cards += insights.overview.unique_catalog_cards;
    sets_represented += insights.overview.sets_represented;
    variant_total += insights.total_variants;
    for (const s of insights.sets) {
      if (s.progress.percent > max_set_percent) max_set_percent = s.progress.percent;
    }
  }

  return {
    total_cards,
    unique_cards,
    sets_represented,
    binder_count: input.binderCount,
    variant_total,
    badges: computeBinderBadges({
      total_cards,
      sets_represented,
      binder_count: input.binderCount,
      max_set_percent,
    }),
  };
}
