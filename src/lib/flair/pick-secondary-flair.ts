import { FLAIR_PRIORITY } from "@/lib/flair/flair-meta";
import { isSeasonalFlairKey } from "@/lib/events/seasonal-events";

/**
 * Second non-seasonal flair chip: next key in `FLAIR_PRIORITY` after the primary, still earned.
 */
export function pickSecondaryFlairKey(
  earnedKeys: string[],
  primaryFlairKey: string | null | undefined
): string | null {
  const primary = primaryFlairKey?.trim() ?? "";
  const set = new Set(earnedKeys.map((k) => k.trim()).filter(Boolean));
  for (const k of FLAIR_PRIORITY) {
    if (!set.has(k)) continue;
    if (primary && k === primary) continue;
    if (isSeasonalFlairKey(k)) continue;
    return k;
  }
  for (const k of earnedKeys) {
    const t = k.trim();
    if (!t || t === primary || isSeasonalFlairKey(t)) continue;
    return t;
  }
  return null;
}
