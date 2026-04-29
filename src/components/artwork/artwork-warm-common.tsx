"use client";

import {
  preloadArtwork,
  preloadHeroArtwork,
  preloadMarketingMotifs,
  preloadOGTemplates,
} from "@/lib/ui/useArtwork";
import type { ArtworkKey } from "@/lib/ui/artwork-tokens";
import { useEffect } from "react";

/** Preload textures and motifs used on dashboard / binder shells to reduce first-paint flash. */
const DASHBOARD_KEYS = [
  "textures.paper",
  "motifs.grid",
  "overlays.softLight",
  "binder.rings",
] as const satisfies readonly ArtworkKey[];

export function ArtworkWarmDashboard() {
  useEffect(() => {
    preloadArtwork([...DASHBOARD_KEYS]);
    preloadHeroArtwork();
    preloadMarketingMotifs();
    preloadOGTemplates();
  }, []);
  return null;
}
