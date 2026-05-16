import type { Metadata } from "next";
import { mcaAbsoluteUrl } from "@/lib/seo/site-url";

export type McaMarketingMetadataInput = {
  title: string;
  description: string;
  path: string;
  /** Site-relative OG image path */
  ogImagePath?: string;
  noIndex?: boolean;
};

/**
 * Full marketing SEO: canonical, Open Graph, and Twitter cards.
 */
export function mcaMarketingMetadata(input: McaMarketingMetadataInput): Metadata {
  const path = input.path.startsWith("/") ? input.path : `/${input.path}`;
  const url = mcaAbsoluteUrl(path);
  const ogImage = input.ogImagePath
    ? mcaAbsoluteUrl(input.ogImagePath)
    : mcaAbsoluteUrl("/marketing/og/home-hero.svg");

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: path },
    robots: input.noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      type: "website",
      siteName: "MyCardArchive",
      images: [{ url: ogImage, width: 1200, height: 630, alt: input.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [ogImage],
    },
  };
}
