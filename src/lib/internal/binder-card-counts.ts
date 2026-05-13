/**
 * Pure helpers for integrity / admin scans (reduces per-binder round-trips).
 */
export function aggregateCountsByKey(
  rows: { binder_id: string | null }[] | null | undefined
): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows ?? []) {
    const id = r.binder_id;
    if (!id) continue;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}
