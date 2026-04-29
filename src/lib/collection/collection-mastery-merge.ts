import { BINDER_MASTERY_CATALOG, getBinderMasteryEntry } from "@/lib/collection/binder-mastery-catalog";
import { getSetCompletionEntry, SET_COMPLETION_CATALOG } from "@/lib/collection/set-completion-catalog";

export type CollectionMasteryType = "binder" | "set";

export type CollectionMasteryDbRow = {
  mastery_type: CollectionMasteryType;
  mastery_key: string;
  completed_count: number;
  is_complete: boolean;
  completed_at: string | null;
};

export type CollectionMasteryProfileRow = {
  masteryType: CollectionMasteryType;
  masteryKey: string;
  displayName: string;
  description: string;
  threshold: number;
  completedCount: number;
  isComplete: boolean;
  completedAt: string | null;
  badgeKey?: string;
  rewardFlairKey?: string;
};

export function buildFullBinderMasteryRows(dbRows: CollectionMasteryDbRow[]): CollectionMasteryProfileRow[] {
  const byKey = new Map(
    dbRows.filter((r) => r.mastery_type === "binder").map((r) => [r.mastery_key, r])
  );
  return BINDER_MASTERY_CATALOG.map((meta) => {
    const r = byKey.get(meta.masteryId);
    const completedCount = r?.completed_count ?? 0;
    const isComplete = r?.is_complete ?? false;
    const completedAt = r?.completed_at ?? null;
    return {
      masteryType: "binder" as const,
      masteryKey: meta.masteryId,
      displayName: meta.displayName,
      description: meta.description,
      threshold: meta.thresholdBindersCompleted,
      completedCount,
      isComplete,
      completedAt,
      badgeKey: meta.badgeKey,
      rewardFlairKey: isComplete ? meta.rewardFlairKey : undefined,
    };
  });
}

export function buildFullSetCompletionRows(dbRows: CollectionMasteryDbRow[]): CollectionMasteryProfileRow[] {
  const byKey = new Map(dbRows.filter((r) => r.mastery_type === "set").map((r) => [r.mastery_key, r]));
  return SET_COMPLETION_CATALOG.map((meta) => {
    const r = byKey.get(meta.completionId);
    const completedCount = r?.completed_count ?? 0;
    const isComplete = r?.is_complete ?? false;
    const completedAt = r?.completed_at ?? null;
    return {
      masteryType: "set" as const,
      masteryKey: meta.completionId,
      displayName: meta.displayName,
      description: meta.description,
      threshold: meta.thresholdSetsCompleted,
      completedCount,
      isComplete,
      completedAt,
      badgeKey: meta.badgeKey,
      rewardFlairKey: isComplete ? meta.rewardFlairKey : undefined,
    };
  });
}

export function collectionMasteryRewardFlairKeysFromRows(rows: CollectionMasteryDbRow[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    if (!r.is_complete) continue;
    const fk =
      r.mastery_type === "binder"
        ? getBinderMasteryEntry(r.mastery_key)?.rewardFlairKey?.trim()
        : getSetCompletionEntry(r.mastery_key)?.rewardFlairKey?.trim();
    if (fk && !seen.has(fk)) {
      seen.add(fk);
      out.push(fk);
    }
  }
  return out;
}

/** Prefer in-progress mastery with a badge, then first completed (binder catalog, then set catalog). */
export function pickTopCollectionMasteryBadgeKey(rows: CollectionMasteryDbRow[]): string | null {
  const byKey = (t: CollectionMasteryType, k: string) =>
    rows.find((r) => r.mastery_type === t && r.mastery_key === k);
  for (const m of BINDER_MASTERY_CATALOG) {
    if (!m.badgeKey) continue;
    const r = byKey("binder", m.masteryId);
    const n = r?.completed_count ?? 0;
    const done = r?.is_complete ?? false;
    if (!done && n > 0) return m.badgeKey;
  }
  for (const m of SET_COMPLETION_CATALOG) {
    if (!m.badgeKey) continue;
    const r = byKey("set", m.completionId);
    const n = r?.completed_count ?? 0;
    const done = r?.is_complete ?? false;
    if (!done && n > 0) return m.badgeKey;
  }
  for (const m of BINDER_MASTERY_CATALOG) {
    if (!m.badgeKey) continue;
    const r = byKey("binder", m.masteryId);
    if (r?.is_complete) return m.badgeKey;
  }
  for (const m of SET_COMPLETION_CATALOG) {
    if (!m.badgeKey) continue;
    const r = byKey("set", m.completionId);
    if (r?.is_complete) return m.badgeKey;
  }
  return null;
}

export function buildCollectionMasteryInlineSummary(rows: CollectionMasteryDbRow[]): string | null {
  if (rows.length === 0) return null;
  const b = rows.filter((r) => r.mastery_type === "binder");
  const s = rows.filter((r) => r.mastery_type === "set");
  const bc = b.length > 0 ? Math.max(...b.map((r) => r.completed_count)) : 0;
  const sc = s.length > 0 ? Math.max(...s.map((r) => r.completed_count)) : 0;
  if (bc <= 0 && sc <= 0) return null;
  if (bc > 0 && sc > 0) {
    return `Completed ${bc} binder${bc === 1 ? "" : "s"} / ${sc} set${sc === 1 ? "" : "s"}`;
  }
  if (bc > 0) return `Completed ${bc} binder${bc === 1 ? "" : "s"}`;
  return `Completed ${sc} set${sc === 1 ? "" : "s"}`;
}
