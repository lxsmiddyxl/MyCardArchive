import { ARTWORK_CARD_FRAMES, ARTWORK_OVERLAYS } from "@/lib/ui/artwork-tokens";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/**
 * Catalog card image column: basic frame SVG + holo shine on hover.
 * Does not alter catalog data or image URLs.
 */
export function CatalogCardArtworkPanel({ children }: Props) {
  return (
    <div className="group relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-mca-sheet border border-mca-border bg-mca-surface/80 p-mca-lg">
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative public SVG frame */}
      <img
        src={ARTWORK_CARD_FRAMES.basic}
        alt=""
        className="pointer-events-none absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] object-contain text-mca-border"
        width={400}
        height={560}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 ease-mca-standard group-hover:opacity-100"
        style={{
          backgroundImage: `url(${ARTWORK_OVERLAYS.holoShine})`,
          backgroundSize: "cover",
          mixBlendMode: "soft-light",
        }}
        aria-hidden
      />
      <div className="relative z-[1] flex w-full justify-center">{children}</div>
    </div>
  );
}
