/**
 * Binder mastery tiers (fully-filled binder grids).
 * Keep `masteryId` and thresholds aligned with
 * `supabase/migrations/078_user_collection_mastery.sql` (`refresh_user_collection_mastery`).
 *
 * A binder counts as complete when it has at least one `binder_slots` row and every slot has `card_id` set.
 */

export type BinderMasteryCatalogEntry = {
  masteryId: string;
  displayName: string;
  description: string;
  thresholdBindersCompleted: number;
  badgeKey?: string;
  rewardFlairKey?: string;
};

export const BINDER_MASTERY_CATALOG: BinderMasteryCatalogEntry[] = [
  {
    masteryId: "first_binder_complete",
    displayName: "First complete binder",
    description: "Fill every slot in at least one binder that has a grid.",
    thresholdBindersCompleted: 1,
    badgeKey: "cm_binder_first",
    rewardFlairKey: "binder_mastery_first",
  },
  {
    masteryId: "three_binders_complete",
    displayName: "Three complete binders",
    description: "Finish three fully-filled binders — serious organization energy.",
    thresholdBindersCompleted: 3,
    badgeKey: "cm_binder_three",
    rewardFlairKey: "binder_mastery_triple",
  },
  {
    masteryId: "ten_binders_complete",
    displayName: "Ten complete binders",
    description: "Ten binders with no empty slots — a gallery-level collection.",
    thresholdBindersCompleted: 10,
    badgeKey: "cm_binder_ten",
    rewardFlairKey: "binder_mastery_deca",
  },
];

const BY_ID = new Map(BINDER_MASTERY_CATALOG.map((e) => [e.masteryId, e]));

export function getBinderMasteryEntry(masteryId: string): BinderMasteryCatalogEntry | undefined {
  return BY_ID.get(masteryId);
}
