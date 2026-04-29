import {
  mcaOgFallbackImageResponse,
  mcaOgImageResponse,
  OG_SIZE,
} from "@/lib/og/mca-og-image";
import {
  formatTradeIdPreview,
  truncateOgSubtitle,
} from "@/lib/og/og-copy";

/**
 * Trades are visible only to participants (authenticated). OG uses a generic
 * template without counterparty names.
 */
export const runtime = "nodejs";
export const alt = "Trade preview";
export const contentType = "image/png";
export const size = OG_SIZE;

type Props = { params: { id: string } };

export default async function Image({ params }: Props) {
  const tradeId = typeof params?.id === "string" ? params.id.trim() : "";
  if (!tradeId) {
    return mcaOgFallbackImageResponse();
  }

  try {
    return mcaOgImageResponse({
      title: "Trade",
      subtitle: truncateOgSubtitle("Secure swap · MyCardArchive"),
      meta: `Trade ${formatTradeIdPreview(tradeId)}`,
      motifSrc: "/artwork/marketing/marketing-trading-feature.svg",
      theme: "dark",
    });
  } catch {
    return mcaOgFallbackImageResponse();
  }
}
