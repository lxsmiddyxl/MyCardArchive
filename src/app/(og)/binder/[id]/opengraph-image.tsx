import {
  mcaOgFallbackImageResponse,
  mcaOgImageResponse,
  OG_SIZE,
} from "@/lib/og/mca-og-image";
import { formatTradeIdPreview, truncateOgSubtitle } from "@/lib/og/og-copy";

/**
 * Binder rows are private under RLS (no anonymous select). OG renders a branded
 * template with a stable reference id; card counts require a future public-share surface.
 */
export const runtime = "nodejs";
export const alt = "Binder preview";
export const contentType = "image/png";
export const size = OG_SIZE;

type Props = { params: { id: string } };

export default async function Image({ params }: Props) {
  const binderId = typeof params?.id === "string" ? params.id.trim() : "";
  if (!binderId) {
    return mcaOgFallbackImageResponse();
  }

  try {
    return mcaOgImageResponse({
      title: "Binder",
      subtitle: truncateOgSubtitle("Trading card binder · MyCardArchive"),
      meta: `Ref · ${formatTradeIdPreview(binderId)}`,
      motifSrc: "/artwork/marketing/marketing-collection-feature.svg",
      theme: "dark",
    });
  } catch {
    return mcaOgFallbackImageResponse();
  }
}
