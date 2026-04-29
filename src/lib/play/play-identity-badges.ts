export type TopPlayBadgeKey =
  | "commander_enthusiast"
  | "control_specialist"
  | "aggro_master"
  | "deckbuilder";

export type PlayIdentityForBadges = {
  favoriteFormatId: string | null;
  favoriteArchetypeId: string | null;
};

/** Single “top” play badge for inline chips (matches SQL `refresh_user_play_identity_badges` priority). */
export function pickTopPlayBadgeKey(
  row: PlayIdentityForBadges | null | undefined,
  deckCountForBadges: number
): TopPlayBadgeKey | null {
  const fmt = row?.favoriteFormatId?.trim().toLowerCase() ?? "";
  const arch = row?.favoriteArchetypeId?.trim().toLowerCase() ?? "";
  if (fmt === "commander") return "commander_enthusiast";
  if (arch === "control") return "control_specialist";
  if (arch === "aggro") return "aggro_master";
  if (deckCountForBadges >= 3) return "deckbuilder";
  return null;
}
