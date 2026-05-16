export type ExploreActivityItem = {
  id: string;
  kind: string;
  label: string;
  href: string | null;
  created_at: string;
  meta?: Record<string, unknown>;
};

export function sortExploreActivity(items: ExploreActivityItem[]): ExploreActivityItem[] {
  return [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function dedupeExploreActivity(
  items: ExploreActivityItem[],
  max = 40
): ExploreActivityItem[] {
  const seen = new Set<string>();
  const out: ExploreActivityItem[] = [];
  for (const item of sortExploreActivity(items)) {
    const key = `${item.kind}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

export function milestoneLabel(percent: number): string | null {
  if (percent >= 100) return "100% set complete";
  if (percent >= 75) return "75% set milestone";
  if (percent >= 50) return "50% set milestone";
  return null;
}
