import type { Metadata } from "next";
import { mcaAbsoluteUrl } from "@/lib/seo/site-url";

export type McaPublicShareMetadataInput = {
  title: string;
  description: string;
  path: string;
  ogImagePath?: string;
  noIndex?: boolean;
};

/** SEO for public binder, profile, and deck share URLs. */
export function mcaPublicShareMetadata(input: McaPublicShareMetadataInput): Metadata {
  const path = input.path.startsWith("/") ? input.path : `/${input.path}`;
  const url = mcaAbsoluteUrl(path);
  const ogImage = input.ogImagePath ? mcaAbsoluteUrl(input.ogImagePath) : undefined;

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
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: input.title }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: input.title,
      description: input.description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}
