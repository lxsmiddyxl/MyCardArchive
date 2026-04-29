import { type ArtworkKey, getArtworkPath } from "@/lib/ui/artwork-tokens";

export { getArtworkPath, type ArtworkKey };

const HERO_KEYS = [
  "hero.dashboard.light",
  "hero.dashboard.dark",
  "hero.landing.light",
  "hero.landing.dark",
] as const satisfies readonly ArtworkKey[];

const MARKETING_MOTIF_KEYS = [
  "motifs.radiant",
  "motifs.holoGrid",
  "motifs.arc",
] as const satisfies readonly ArtworkKey[];

const OG_KEYS = ["og.base", "og.light", "og.dark", "og.logo"] as const satisfies readonly ArtworkKey[];

/**
 * Warm the browser image cache for listed assets (client-only; no-ops on server).
 * Call after mount to reduce layout shift when layers appear.
 */
export function preloadArtwork(keys: readonly ArtworkKey[]): void {
  if (typeof window === "undefined") return;
  for (const key of keys) {
    const img = new Image();
    img.src = getArtworkPath(key);
  }
}

/** Preload dashboard + landing hero plates (light/dark). */
export function preloadHeroArtwork(): void {
  preloadArtwork([...HERO_KEYS]);
}

/** Preload marketing motif SVGs. */
export function preloadMarketingMotifs(): void {
  preloadArtwork([...MARKETING_MOTIF_KEYS]);
}

/** Preload OG template rasters + logo for `/og` and link previews. */
export function preloadOGTemplates(): void {
  preloadArtwork([...OG_KEYS]);
}
