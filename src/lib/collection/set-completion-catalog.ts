/**
 * Master-set completion (every catalog card in a set owned with `catalog_card_id` link).
 * Keep `completionId` and thresholds aligned with
 * `supabase/migrations/078_user_collection_mastery.sql` (`refresh_user_collection_mastery`).
 */

export type SetCompletionCatalogEntry = {
  completionId: string;
  displayName: string;
  description: string;
  thresholdSetsCompleted: number;
  badgeKey?: string;
  rewardFlairKey?: string;
};

export const SET_COMPLETION_CATALOG: SetCompletionCatalogEntry[] = [
  {
    completionId: "first_set_complete",
    displayName: "First completed set",
    description: "Own at least one fully complete catalog set (every card in the set).",
    thresholdSetsCompleted: 1,
    badgeKey: "cm_set_first",
    rewardFlairKey: "set_mastery_first",
  },
  {
    completionId: "five_sets_complete",
    displayName: "Five completed sets",
    description: "Five master sets logged in your binders.",
    thresholdSetsCompleted: 5,
    badgeKey: "cm_set_five",
    rewardFlairKey: "set_mastery_five",
  },
  {
    completionId: "ten_sets_complete",
    displayName: "Ten completed sets",
    description: "Ten master sets — deep completion across the catalog.",
    thresholdSetsCompleted: 10,
    badgeKey: "cm_set_ten",
    rewardFlairKey: "set_mastery_ten",
  },
];

const BY_ID = new Map(SET_COMPLETION_CATALOG.map((e) => [e.completionId, e]));

export function getSetCompletionEntry(completionId: string): SetCompletionCatalogEntry | undefined {
  return BY_ID.get(completionId);
}
