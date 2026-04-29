import { McaIcons } from "@/lib/icons/mca-icons";

/** Maps card rarity labels to /public/icons/collection/rarity/*.svg */
export function rarityIconSrc(rarity: string | null | undefined): string {
  const r = (rarity ?? "").toLowerCase();
  const x = McaIcons.collection.rarity;
  if (r.includes("secret")) return x.secret;
  if (r.includes("ultra")) return x.ultra;
  if (r.includes("rare")) return x.rare;
  if (r.includes("uncommon")) return x.uncommon;
  return x.common;
}
