import { FeaturePageLayout } from "@/mca-ui/marketing/FeaturePageLayout";
import { FEATURE_PAGES } from "@/mca-ui/marketing/marketing-content";
import { mcaMarketingMetadata } from "@/lib/seo/marketing-metadata";
import type { Metadata } from "next";

const config = FEATURE_PAGES.find((p) => p.slug === "scanning")!;

export const metadata: Metadata = mcaMarketingMetadata({
  title: `${config.title} · MyCardArchive`,
  description: config.description,
  path: config.path,
  ogImagePath: config.ogImagePath,
});

export default function ScanningFeaturePage() {
  return <FeaturePageLayout config={config} />;
}
