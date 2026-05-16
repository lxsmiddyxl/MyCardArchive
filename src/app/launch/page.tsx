import { LaunchPageContent } from "@/mca-ui/launch/LaunchPage";
import { mcaMarketingMetadata } from "@/lib/seo/marketing-metadata";
import type { Metadata } from "next";

export const metadata: Metadata = mcaMarketingMetadata({
  title: "What's New — MyCardArchive Launch",
  description:
    "MyCardArchive is live: digital Pokémon TCG binders, intelligent scanning, public showcases, and embeds.",
  path: "/launch",
  ogImagePath: "/launch/og-launch.svg",
});

export default function LaunchRoutePage() {
  return <LaunchPageContent />;
}
