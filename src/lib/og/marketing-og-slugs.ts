/**
 * Static marketing OG slugs for `/marketing/[slug]/opengraph-image`.
 */
export type MarketingOgEntry = {
  title: string;
  subtitle: string;
  motifSrc: string;
  theme?: "dark" | "light";
};

export const MARKETING_OG_BY_SLUG: Record<string, MarketingOgEntry> = {
  home: {
    title: "Your collection, organized",
    subtitle: "Binders, decks, trading, and scan — in one place.",
    motifSrc: "/artwork/marketing/marketing-home-hero.svg",
    theme: "dark",
  },
  collect: {
    title: "Collect",
    subtitle: "Track cards in binders with clear, tier-aware limits.",
    motifSrc: "/artwork/marketing/marketing-collection-feature.svg",
    theme: "dark",
  },
  trade: {
    title: "Trade",
    subtitle: "Coordinate swaps with a focused trading flow.",
    motifSrc: "/artwork/marketing/marketing-trading-feature.svg",
    theme: "dark",
  },
  scan: {
    title: "Scan",
    subtitle: "Add cards from photos with the scan pipeline.",
    motifSrc: "/artwork/marketing/marketing-scan-feature.svg",
    theme: "dark",
  },
};

export const DEFAULT_MARKETING_SLUG = "home";
