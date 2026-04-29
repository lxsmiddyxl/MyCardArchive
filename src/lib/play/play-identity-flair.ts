import { isValidArchetypeId } from "@/lib/play/archetype-catalog";
import { isValidFormatId } from "@/lib/play/formats-catalog";

export type PlayIdentityRow = {
  favoriteFormatId: string | null;
  favoriteArchetypeId: string | null;
  favoriteDeckName: string | null;
};

/** Derive earned flair keys from saved play identity (server-aligned with catalog). */
export function playFlairKeysFromIdentity(row: PlayIdentityRow | null | undefined): string[] {
  if (!row) return [];
  const keys: string[] = [];
  const fmt = row.favoriteFormatId?.trim().toLowerCase() ?? "";
  if (fmt && isValidFormatId(fmt)) {
    keys.push(`play_format_${fmt}`);
  }
  const arch = row.favoriteArchetypeId?.trim().toLowerCase() ?? "";
  if (arch && isValidArchetypeId(arch)) {
    keys.push(`play_archetype_${arch}`);
  }
  const deck = row.favoriteDeckName?.trim() ?? "";
  if (deck.length > 0) {
    keys.push("play_favorite_deck");
  }
  return keys;
}
