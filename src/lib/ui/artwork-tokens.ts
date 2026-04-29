/**
 * Core + marketing artwork — public URLs under `/public/artwork/core/` and
 * `/public/artwork/marketing/`. Tier hero strips live under `/public/artwork/tier/`.
 */

export const ARTWORK_TEXTURES = {
  noise: "/artwork/core/textures/texture-noise.png",
  paper: "/artwork/core/textures/texture-paper.png",
  holoFoil: "/artwork/core/textures/texture-holo-foil.png",
  carbon: "/artwork/core/textures/texture-carbon.png",
  holoGradient: "/artwork/marketing/textures/texture-holo-gradient.png",
  softVignette: "/artwork/marketing/textures/texture-soft-vignette.png",
} as const;

export const ARTWORK_MOTIFS = {
  circles: "/artwork/core/motifs/motif-circles.svg",
  grid: "/artwork/core/motifs/motif-grid.svg",
  dots: "/artwork/core/motifs/motif-dots.svg",
  waves: "/artwork/core/motifs/motif-waves.svg",
  radiant: "/artwork/marketing/motifs/motif-radiant.svg",
  holoGrid: "/artwork/marketing/motifs/motif-holo-grid.svg",
  arc: "/artwork/marketing/motifs/motif-arc.svg",
} as const;

export const ARTWORK_OVERLAYS = {
  scanlines: "/artwork/core/overlays/overlay-scanlines.png",
  holoShine: "/artwork/core/overlays/overlay-holo-shine.png",
  softLight: "/artwork/core/overlays/overlay-soft-light.png",
} as const;

export const ARTWORK_SILHOUETTES = {
  rounded: "/artwork/core/silhouettes/card-silhouette-rounded.svg",
  square: "/artwork/core/silhouettes/card-silhouette-square.svg",
} as const;

export const ARTWORK_BINDER = {
  rings: "/artwork/core/binder/binder-rings.svg",
  shadow: "/artwork/core/binder/binder-shadow.png",
} as const;

export const ARTWORK_CARD_FRAMES = {
  basic: "/artwork/core/cards/card-frame-basic.svg",
  holo: "/artwork/core/cards/card-frame-holo.svg",
} as const;

export const ARTWORK_SCANLINES = {
  vertical: "/artwork/core/scanlines/scanline-vertical.png",
  horizontal: "/artwork/core/scanlines/scanline-horizontal.png",
} as const;

/** Branded hero plates (light/dark) for landing and dashboard. */
export const ARTWORK_HERO = {
  dashboard: {
    light: "/artwork/marketing/hero/hero-dashboard-light.png",
    dark: "/artwork/marketing/hero/hero-dashboard-dark.png",
  },
  landing: {
    light: "/artwork/marketing/hero/hero-landing-light.png",
    dark: "/artwork/marketing/hero/hero-landing-dark.png",
  },
} as const;

/** Aliases for marketing-only motif names (subset of `ARTWORK_MOTIFS`). */
export const ARTWORK_MARKETING_MOTIFS = {
  radiant: ARTWORK_MOTIFS.radiant,
  holoGrid: ARTWORK_MOTIFS.holoGrid,
  arc: ARTWORK_MOTIFS.arc,
} as const;

export const ARTWORK_OG = {
  base: "/artwork/marketing/og/og-template-base.png",
  light: "/artwork/marketing/og/og-template-light.png",
  dark: "/artwork/marketing/og/og-template-dark.png",
  logo: "/artwork/marketing/og/og-logo.svg",
} as const;

export const ARTWORK_MARKETING_TEXTURES = {
  holoGradient: ARTWORK_TEXTURES.holoGradient,
  softVignette: ARTWORK_TEXTURES.softVignette,
} as const;

/** Horizontal strips for `/tier` — keys align with `user_tiers.tier_slug` (canonical slugs). */
export const ARTWORK_TIER_STRIPS = {
  free: "/artwork/tier/strip-free.svg",
  pro: "/artwork/tier/strip-pro.svg",
  elite: "/artwork/tier/strip-elite.svg",
} as const;

export type TierStripSlug = keyof typeof ARTWORK_TIER_STRIPS;

export function getTierStripPath(slug: string): string {
  const s = slug.trim().toLowerCase();
  if (s === "business") {
    return ARTWORK_TIER_STRIPS.elite;
  }
  if (s === "free" || s === "pro" || s === "elite") {
    return ARTWORK_TIER_STRIPS[s];
  }
  return ARTWORK_TIER_STRIPS.free;
}

/** Stable registry keys (spreads from Object.fromEntries do not infer literal keys). */
export type ArtworkKey =
  | `textures.${keyof typeof ARTWORK_TEXTURES}`
  | `motifs.${keyof typeof ARTWORK_MOTIFS}`
  | `overlays.${keyof typeof ARTWORK_OVERLAYS}`
  | `silhouettes.${keyof typeof ARTWORK_SILHOUETTES}`
  | `binder.${keyof typeof ARTWORK_BINDER}`
  | `cards.${keyof typeof ARTWORK_CARD_FRAMES}`
  | `scanlines.${keyof typeof ARTWORK_SCANLINES}`
  | "hero.dashboard.light"
  | "hero.dashboard.dark"
  | "hero.landing.light"
  | "hero.landing.dark"
  | `og.${keyof typeof ARTWORK_OG}`;

const LOOKUP: Record<ArtworkKey, string> = {
  ...Object.fromEntries(
    Object.entries(ARTWORK_TEXTURES).map(([k, v]) => [`textures.${k}`, v])
  ),
  ...Object.fromEntries(
    Object.entries(ARTWORK_MOTIFS).map(([k, v]) => [`motifs.${k}`, v])
  ),
  ...Object.fromEntries(
    Object.entries(ARTWORK_OVERLAYS).map(([k, v]) => [`overlays.${k}`, v])
  ),
  ...Object.fromEntries(
    Object.entries(ARTWORK_SILHOUETTES).map(([k, v]) => [`silhouettes.${k}`, v])
  ),
  ...Object.fromEntries(
    Object.entries(ARTWORK_BINDER).map(([k, v]) => [`binder.${k}`, v])
  ),
  ...Object.fromEntries(
    Object.entries(ARTWORK_CARD_FRAMES).map(([k, v]) => [`cards.${k}`, v])
  ),
  ...Object.fromEntries(
    Object.entries(ARTWORK_SCANLINES).map(([k, v]) => [`scanlines.${k}`, v])
  ),
  "hero.dashboard.light": ARTWORK_HERO.dashboard.light,
  "hero.dashboard.dark": ARTWORK_HERO.dashboard.dark,
  "hero.landing.light": ARTWORK_HERO.landing.light,
  "hero.landing.dark": ARTWORK_HERO.landing.dark,
  ...Object.fromEntries(Object.entries(ARTWORK_OG).map(([k, v]) => [`og.${k}`, v])),
} as Record<ArtworkKey, string>;

/** Resolve a stable public path for a core or marketing artwork asset. */
export function getArtworkPath(key: ArtworkKey): string {
  return LOOKUP[key];
}
