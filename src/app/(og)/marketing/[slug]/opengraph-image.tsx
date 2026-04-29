import {
  mcaOgFallbackImageResponse,
  mcaOgImageResponse,
  OG_SIZE,
} from "@/lib/og/mca-og-image";
import {
  DEFAULT_MARKETING_SLUG,
  MARKETING_OG_BY_SLUG,
} from "@/lib/og/marketing-og-slugs";
import { truncateOgSubtitle, truncateOgTitle } from "@/lib/og/og-copy";

export const runtime = "nodejs";
export const alt = "MyCardArchive";
export const contentType = "image/png";
export const size = OG_SIZE;

type Props = { params: { slug: string } };

export default async function Image({ params }: Props) {
  const raw =
    typeof params?.slug === "string" ? params.slug.trim().toLowerCase() : "";
  const slug = raw && MARKETING_OG_BY_SLUG[raw] ? raw : DEFAULT_MARKETING_SLUG;
  const entry = MARKETING_OG_BY_SLUG[slug] ?? MARKETING_OG_BY_SLUG[DEFAULT_MARKETING_SLUG];

  try {
    return mcaOgImageResponse({
      title: truncateOgTitle(entry.title),
      subtitle: truncateOgSubtitle(entry.subtitle),
      motifSrc: entry.motifSrc,
      theme: entry.theme ?? "dark",
    });
  } catch {
    return mcaOgFallbackImageResponse();
  }
}
