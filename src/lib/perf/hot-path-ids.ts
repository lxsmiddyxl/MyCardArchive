/** Stable identifiers for latency budgeting and diagnostics. */
export const HOT_PATH_IDS = [
  "hp:home:aboveTheFold",
  "hp:collection:listViewport",
  "hp:trade:detail",
  "hp:activity:feed",
  "hp:notifications:list",
  "hp:search:cards",
] as const;

export type HotPathId = (typeof HOT_PATH_IDS)[number];

export function isHotPathId(s: string): s is HotPathId {
  return (HOT_PATH_IDS as readonly string[]).includes(s);
}
