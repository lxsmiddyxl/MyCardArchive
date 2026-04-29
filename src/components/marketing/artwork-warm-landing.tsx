"use client";

import {
  preloadHeroArtwork,
  preloadMarketingMotifs,
  preloadOGTemplates,
} from "@/lib/ui/useArtwork";
import { useEffect } from "react";

/** Preload marketing hero + motifs + OG assets on the landing route for smoother first paint. */
export function ArtworkWarmLanding() {
  useEffect(() => {
    preloadHeroArtwork();
    preloadMarketingMotifs();
    preloadOGTemplates();
  }, []);
  return null;
}
