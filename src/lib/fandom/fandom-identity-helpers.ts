import {
  type FandomValueKind,
  fandomFlairKey,
  flairKeyForFavoriteSet,
  getFandomOptionById,
} from "@/lib/fandom/fandom-catalog";

export type FandomIdentityFields = {
  favoriteSetId: string | null;
  favoriteEraId: string | null;
  favoriteArtistId: string | null;
  favoriteCharacterId: string | null;
  favoriteThemeId: string | null;
};

export function fandomFlairKeysFromIdentity(row: FandomIdentityFields | null | undefined): string[] {
  if (!row) return [];
  const keys: string[] = [];
  const setId = row.favoriteSetId?.trim();
  const eraId = row.favoriteEraId?.trim();
  const artId = row.favoriteArtistId?.trim();
  const charId = row.favoriteCharacterId?.trim();
  const thId = row.favoriteThemeId?.trim();
  if (setId) keys.push(flairKeyForFavoriteSet(setId)!);
  if (eraId) keys.push(fandomFlairKey("era", eraId));
  if (artId) keys.push(fandomFlairKey("artist", artId));
  if (charId) keys.push(fandomFlairKey("character", charId));
  if (thId) keys.push(fandomFlairKey("theme", thId));
  return keys;
}

const FANDOM_BADGE_DOMINANCE: Array<
  keyof Pick<
    FandomIdentityFields,
    "favoriteSetId" | "favoriteEraId" | "favoriteArtistId" | "favoriteCharacterId" | "favoriteThemeId"
  >
> = [
  "favoriteSetId",
  "favoriteEraId",
  "favoriteArtistId",
  "favoriteCharacterId",
  "favoriteThemeId",
];

const BADGE_FOR_FIELD = {
  favoriteSetId: "set_loyalist",
  favoriteEraId: "era_specialist",
  favoriteArtistId: "artist_devotee",
  favoriteCharacterId: "character_fanatic",
  favoriteThemeId: "theme_collector",
} as const;

export type TopFandomBadgeKey =
  | "set_loyalist"
  | "era_specialist"
  | "artist_devotee"
  | "character_fanatic"
  | "theme_collector";

/** Pick strongest single fandom badge for inline chip (set > era > artist …). */
export function pickTopFandomBadgeKey(row: FandomIdentityFields | null | undefined): TopFandomBadgeKey | null {
  if (!row) return null;
  for (const fk of FANDOM_BADGE_DOMINANCE) {
    const id = row[fk]?.trim();
    if (!id) continue;
    return BADGE_FOR_FIELD[fk];
  }
  return null;
}

/** First earned fandom flair in stable tier order (subset of identity). */
export function pickTopFandomFlairKey(
  earnedKeys: string[],
  row: FandomIdentityFields | null | undefined
): string | null {
  const pref = fandomFlairKeysFromIdentity(row);
  const setEarned = new Set(earnedKeys);
  for (const k of pref) {
    if (setEarned.has(k)) return k;
  }
  // Unknown catalog set id flair key may still earn if server computed flair key elsewhere.
  const extra = [...setEarned].filter((x) => x.startsWith("fandom_"));
  if (extra.length === 0) return null;
  extra.sort((a, b) => a.localeCompare(b));
  return extra[0] ?? null;
}

export function pickSecondaryFandomFlairKey(
  earnedKeys: string[],
  row: FandomIdentityFields | null | undefined
): string | null {
  const ordered = fandomFlairKeysFromIdentity(row).filter((k) => earnedKeys.includes(k));
  return ordered.length >= 2 ? ordered[1]! : null;
}

/** Short social summary line ("Favorite era: Neo · Favorite artist: Arita …"). */
export function buildFandomSummary(row: FandomIdentityFields | null | undefined): string | null {
  if (!row) return null;
  const chunks: string[] = [];
  const sid = row.favoriteSetId?.trim();
  const eid = row.favoriteEraId?.trim();
  const aid = row.favoriteArtistId?.trim();
  const cid = row.favoriteCharacterId?.trim();
  const tid = row.favoriteThemeId?.trim();
  if (sid) {
    const opt = getFandomOptionById("set", sid);
    chunks.push(`Favorite set: ${opt?.displayName ?? sid}`);
  }
  if (eid) {
    const opt = getFandomOptionById("era", eid);
    chunks.push(`Favorite era: ${opt?.displayName ?? eid}`);
  }
  if (aid) {
    const opt = getFandomOptionById("artist", aid);
    chunks.push(`Favorite artist: ${opt?.displayName ?? aid}`);
  }
  if (cid) {
    const opt = getFandomOptionById("character", cid);
    chunks.push(`Lineage: ${opt?.displayName ?? cid}`);
  }
  if (tid) {
    const opt = getFandomOptionById("theme", tid);
    chunks.push(`Frame: ${opt?.displayName ?? tid}`);
  }
  if (chunks.length === 0) return null;
  return chunks.join(" · ");
}
