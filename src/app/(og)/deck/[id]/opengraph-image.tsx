import {
  mcaOgFallbackImageResponse,
  mcaOgImageResponse,
  OG_SIZE,
} from "@/lib/og/mca-og-image";
import { truncateOgSubtitle, truncateOgTitle } from "@/lib/og/og-copy";
import { loadPublicDeck } from "@/lib/public-deck/load-public-deck";

export const runtime = "nodejs";
export const alt = "Deck preview";
export const contentType = "image/png";
export const size = OG_SIZE;

type Props = { params: { id: string } };

export default async function Image({ params }: Props) {
  const deckId = typeof params?.id === "string" ? params.id.trim() : "";
  if (!deckId) {
    return mcaOgFallbackImageResponse();
  }

  let result: Awaited<ReturnType<typeof loadPublicDeck>>;
  try {
    result = await loadPublicDeck(deckId);
  } catch {
    return mcaOgFallbackImageResponse();
  }

  if (!result.ok) {
    try {
      return mcaOgImageResponse({
        title: truncateOgTitle("Deck"),
        subtitle: truncateOgSubtitle(
          result.status === 403
            ? "This deck is not shared publicly."
            : "Deck preview · MyCardArchive"
        ),
        motifSrc: "/artwork/marketing/marketing-home-hero.svg",
        theme: "dark",
      });
    } catch {
      return mcaOgFallbackImageResponse();
    }
  }

  const { deck, owner_display_name, deck_stats, hero } = result.data;
  const total = deck_stats?.total_cards;
  const meta =
    typeof total === "number" ? `${total} cards` : undefined;

  try {
    return mcaOgImageResponse({
      title: truncateOgTitle(deck.name),
      subtitle: truncateOgSubtitle(
        `${deck.format} · ${owner_display_name}`.trim()
      ),
      meta,
      heroImageUrl: hero?.image_url ?? null,
      motifSrc: "/artwork/marketing/marketing-home-hero.svg",
      theme: "dark",
    });
  } catch {
    return mcaOgFallbackImageResponse();
  }
}
