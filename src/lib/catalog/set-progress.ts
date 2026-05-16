export type SetCompletionProgress = {
  owned: number;
  total: number;
  percent: number;
};

export function computeSetCompletion(owned: number, total: number): SetCompletionProgress {
  const safeTotal = Math.max(0, total);
  const safeOwned = Math.max(0, Math.min(owned, safeTotal || owned));
  const percent =
    safeTotal > 0 ? Math.round((safeOwned / safeTotal) * 100) : safeOwned > 0 ? 100 : 0;
  return { owned: safeOwned, total: safeTotal, percent };
}

/** Match catalog card id to highlight target by collector number stem. */
export function catalogHitMatchesNumber(hits: { id: string; number: string }[], targetNumber: string): string | null {
  const stem = (targetNumber.split("/")[0]?.trim() ?? targetNumber.trim()).replace(/^#/, "");
  if (!stem) return null;
  const hit = hits.find((h) => {
    const hStem = (h.number.split("/")[0]?.trim() ?? h.number).replace(/^#/, "");
    return hStem === stem;
  });
  return hit?.id ?? null;
}
