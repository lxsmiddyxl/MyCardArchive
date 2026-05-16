import { MarketingLanding } from "@/mca-ui/marketing/MarketingLanding";
import { mcaMarketingMetadata } from "@/lib/seo/marketing-metadata";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

/** ISR — marketing homepage (Launch Prep Phase 3). */
export const revalidate = 3600;

export const metadata: Metadata = mcaMarketingMetadata({
  title: "MyCardArchive — Pokémon TCG binders, scans & collector profiles",
  description:
    "Organize Pokémon TCG cards in digital binders, scan photos into your collection, and share your collector portfolio.",
  path: "/",
  ogImagePath: "/marketing/og/home-hero.svg",
});

export default async function MarketingHomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/binders");
  }

  return <MarketingLanding />;
}
