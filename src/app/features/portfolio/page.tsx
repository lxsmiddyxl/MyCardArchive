import { FeaturePageLayout } from "@/mca-ui/marketing/FeaturePageLayout";
import { FEATURE_PAGES } from "@/mca-ui/marketing/marketing-content";
import { mcaMarketingMetadata } from "@/lib/seo/marketing-metadata";
import type { Metadata } from "next";

export const revalidate = 3600;

const config = FEATURE_PAGES.find((p) => p.slug === "portfolio")!;

export const metadata: Metadata = mcaMarketingMetadata({
  title: `${config.title} · MyCardArchive`,
  description: config.description,
  path: config.path,
  ogImagePath: config.ogImagePath,
});

export default function PortfolioFeaturePage() {
  return <FeaturePageLayout config={config} />;
}
