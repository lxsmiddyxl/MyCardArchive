import {
  mcaOgFallbackImageResponse,
  mcaOgImageResponse,
  OG_SIZE,
} from "@/lib/og/mca-og-image";
import { truncateOgSubtitle, truncateOgTitle } from "@/lib/og/og-copy";
import { tryCreateAnonServerClient } from "@/lib/supabase/anon-server";

export const runtime = "nodejs";
export const alt = "Catalog card preview";
export const contentType = "image/png";
export const size = OG_SIZE;

type Props = { params: { id: string } };

type CardRow = {
  name: string;
  number: string;
  rarity: string | null;
  image_large: string | null;
  image_small: string | null;
  catalog_sets: { id: string; name: string } | null;
};

export default async function Image({ params }: Props) {
  const cardId = typeof params?.id === "string" ? params.id.trim() : "";
  if (!cardId) {
    return mcaOgFallbackImageResponse();
  }

  const supabase = tryCreateAnonServerClient();
  if (!supabase) {
    return mcaOgFallbackImageResponse();
  }

  const { data, error } = await supabase
    .from("catalog_cards")
    .select("name, number, rarity, image_large, image_small, catalog_sets(id, name)")
    .eq("id", cardId)
    .maybeSingle();

  if (error || !data) {
    return mcaOgFallbackImageResponse();
  }

  const row = data as unknown as CardRow;
  const setName = row.catalog_sets?.name;
  const setLabel = row.catalog_sets?.id ?? "Catalog";
  const subtitle = setName
    ? truncateOgSubtitle(`${setName} · #${row.number}`)
    : truncateOgSubtitle(`Set ${setLabel} · #${row.number}`);
  const rarityLine = row.rarity ? truncateOgSubtitle(row.rarity) : undefined;
  const hero =
    row.image_large?.trim() ||
    row.image_small?.trim() ||
    null;

  try {
    return mcaOgImageResponse({
      title: truncateOgTitle(row.name),
      subtitle,
      meta: rarityLine,
      heroImageUrl: hero,
      motifSrc: "/artwork/marketing/marketing-collection-feature.svg",
      theme: "dark",
    });
  } catch {
    return mcaOgFallbackImageResponse();
  }
}
