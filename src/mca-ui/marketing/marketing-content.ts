export type FeaturePageConfig = {
  slug: string;
  path: string;
  title: string;
  headline: string;
  description: string;
  bullets: string[];
  imageSrc: string;
  ogImagePath: string;
};

export const FEATURE_PAGES: FeaturePageConfig[] = [
  {
    slug: "scanning",
    path: "/features/scanning",
    title: "Intelligent Scanning",
    headline: "Scan cards into your collection",
    description:
      "Point your camera at a Pokémon card and MCA identifies it, suggests variants, and drops it into the binder you choose.",
    bullets: [
      "Fast photo capture with glare-aware tips",
      "Catalog match with confidence bands",
      "Batch mode for ripping packs or sorting bulk",
    ],
    imageSrc: "/marketing/scan-feature.svg",
    ogImagePath: "/marketing/scan-feature.svg",
  },
  {
    slug: "binders",
    path: "/features/binders",
    title: "Binder Engine",
    headline: "Digital binders that feel like the real thing",
    description:
      "Organize sets, trades, and grails in paginated binders with set progress, missing-card lists, and shareable public pages.",
    bullets: [
      "Set completion and rarity insights",
      "Drag-and-drop pages and slots",
      "Public share links and embeds",
    ],
    imageSrc: "/marketing/binder-feature.svg",
    ogImagePath: "/marketing/binder-feature.svg",
  },
  {
    slug: "social",
    path: "/features/social",
    title: "Social Layer",
    headline: "Collectors, not just collections",
    description:
      "Follow trainers, subscribe to binders, react to updates, and explore what the community is building.",
    bullets: [
      "Public collector profiles",
      "Binder subscriptions and activity",
      "Explore shared binders",
    ],
    imageSrc: "/marketing/social-feature.svg",
    ogImagePath: "/marketing/trading-feature.svg",
  },
  {
    slug: "portfolio",
    path: "/features/portfolio",
    title: "Portfolio System",
    headline: "Showcase your best work",
    description:
      "Group binders into collections, bundle themed sets, and pin favorites to your profile showcase.",
    bullets: [
      "Binder collections and themed groups",
      "Profile showcase pins",
      "Export and share your progress",
    ],
    imageSrc: "/marketing/portfolio-feature.svg",
    ogImagePath: "/marketing/dashboard-hero.svg",
  },
];

export const GITHUB_REPO_URL = "https://github.com/lxsmiddyxl/MyCardArchive";
