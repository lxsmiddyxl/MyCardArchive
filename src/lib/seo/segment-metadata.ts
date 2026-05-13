import type { Metadata } from "next";

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
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: path },
    openGraph: {
      title: input.title,
      description: input.description,
      url: path,
      type: "website",
    },
  };
}
