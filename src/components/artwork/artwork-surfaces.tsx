import { ARTWORK_TEXTURES, getTierStripPath } from "@/lib/ui/artwork-tokens";
import type { ReactNode } from "react";

type TierArtworkStripProps = {
  /** `user_tiers.tier_slug` (e.g. free, pro, elite, business). */
  tierSlug: string;
};

/**
 * Tier-specific hero strip for `/tier` — uses assets under `/public/artwork/tier/`.
 */
export function TierArtworkStrip({ tierSlug }: TierArtworkStripProps) {
  const src = getTierStripPath(tierSlug);
  return (
    <div
      className="pointer-events-none mb-mca-base h-14 w-full overflow-hidden rounded-mca-block ring-1 ring-mca-border-subtle/60 dark:ring-mca-border-subtle/40"
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static public SVG strip */}
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover object-center opacity-90 dark:opacity-[0.85]"
        loading="eager"
        decoding="async"
      />
    </div>
  );
}

/** Binder list / detail: paper texture behind content. */
export function BinderPaperBackdrop({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-0 -z-10 rounded-mca-sheet opacity-[0.22] dark:opacity-[0.18]"
        style={{
          backgroundImage: `url(${ARTWORK_TEXTURES.paper})`,
          backgroundSize: "180px auto",
        }}
        aria-hidden
      />
      {children}
    </div>
  );
}
