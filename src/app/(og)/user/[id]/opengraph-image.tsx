import {
  mcaOgFallbackImageResponse,
  mcaOgImageResponse,
  OG_SIZE,
} from "@/lib/og/mca-og-image";
import {
  formatUserIdPreview,
  truncateOgSubtitle,
} from "@/lib/og/og-copy";

/**
 * Profiles are private under RLS (authenticated-only select). OG shows a branded
 * collector template without usernames until a public profile exists.
 */
export const runtime = "nodejs";
export const alt = "Collector profile preview";
export const contentType = "image/png";
export const size = OG_SIZE;

type Props = { params: { id: string } };

export default async function Image({ params }: Props) {
  const userId = typeof params?.id === "string" ? params.id.trim() : "";
  if (!userId) {
    return mcaOgFallbackImageResponse();
  }

  try {
    return mcaOgImageResponse({
      title: "Collector",
      subtitle: truncateOgSubtitle("MyCardArchive profile"),
      meta: `Ref · ${formatUserIdPreview(userId)}`,
      motifSrc: "/artwork/marketing/marketing-dashboard-hero.svg",
      emblemSrc: "/artwork/achievements/tier-gold.svg",
      theme: "dark",
    });
  } catch {
    return mcaOgFallbackImageResponse();
  }
}
