/** Badge / achievement grouping for profile depth (Phase 64). */
export type BadgeCategory = "activity" | "contribution" | "reliability";

const RELIABILITY_HINTS = /reliab|trust|streak|trade/i;
const CONTRIBUTION_HINTS = /post|comment|community|club|guide|share/i;

export function inferBadgeCategoryFromSlug(slug: string): BadgeCategory {
  const s = slug.trim().toLowerCase();
  if (RELIABILITY_HINTS.test(s)) return "reliability";
  if (CONTRIBUTION_HINTS.test(s)) return "contribution";
  return "activity";
}
