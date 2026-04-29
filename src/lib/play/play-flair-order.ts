import { listAllArchetypes } from "@/lib/play/archetype-catalog";
import { listAllFormats } from "@/lib/play/formats-catalog";

/** Order for `pickTopFlairKey` / secondary play flair (higher index = more prominent in play group). */
export const PLAY_FLAIR_PRIORITY_ORDER: readonly string[] = [
  ...listAllFormats().map((f) => `play_format_${f.formatId}`),
  ...listAllArchetypes().map((a) => `play_archetype_${a.archetypeId}`),
  "play_favorite_deck",
];

export function isPlayFlairKey(key: string): boolean {
  const k = key.trim();
  return (
    k === "play_favorite_deck" ||
    k.startsWith("play_format_") ||
    k.startsWith("play_archetype_")
  );
}
