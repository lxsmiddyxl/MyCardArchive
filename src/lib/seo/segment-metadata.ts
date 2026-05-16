import type { Metadata } from "next";
import { mcaAbsoluteUrl } from "@/lib/seo/site-url";

export type McaSegmentSeoInput = {
  title: string;
  description: string;
  /** Site-relative path starting with `/` */
  path: string;
};

/**
 * Default segment metadata (canonical + Open Graph) merged with root `metadataBase`.
 */
export function mcaSegmentMetadata(input: McaSegmentSeoInput): Metadata {
  const path = input.path.startsWith("/") ? input.path : `/${input.path}`;
  const url = mcaAbsoluteUrl(path);
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: path },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      type: "website",
      siteName: "MyCardArchive",
    },
    twitter: {
      card: "summary",
      title: input.title,
      description: input.description,
    },
  };
}
