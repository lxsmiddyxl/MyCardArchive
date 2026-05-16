import { clamp01, regionMean, regionStd, type GrayImage } from "@/mca-utils/scan/imageGray";

export type VariantDetectionHints = {
  holoShine: number;
  reverseHoloTexture: number;
  promoStamp: number;
  altArtBorder: number;
  variantGroup: string;
};

/** Lightweight variant heuristics from grayscale card photo. */
export function detectVariantHints(g: GrayImage): VariantDetectionHints {
  const w = g.width;
  const h = g.height;
  const art = regionMean(g, Math.floor(w * 0.12), Math.floor(h * 0.1), Math.floor(w * 0.88), Math.floor(h * 0.72));
  const border = regionMean(g, 0, 0, w - 1, Math.floor(h * 0.08));
  const bottom = regionMean(g, Math.floor(w * 0.2), Math.floor(h * 0.88), Math.floor(w * 0.8), h - 1);
  const artStd = regionStd(g, Math.floor(w * 0.15), Math.floor(h * 0.12), Math.floor(w * 0.85), Math.floor(h * 0.7));

  const specular = clamp01((artStd - 18) / 40);
  const shimmer = clamp01((artStd - 12) / 28) * clamp01(1 - Math.abs(art - border) / 80);
  const stampZone = regionStd(g, Math.floor(w * 0.02), Math.floor(h * 0.02), Math.floor(w * 0.22), Math.floor(h * 0.18));
  const promoStamp = clamp01((stampZone - 25) / 35);
  const borderDelta = Math.abs(border - bottom);
  const altArtBorder = clamp01(borderDelta / 55);

  let variantGroup = "standard";
  if (promoStamp > 0.55) variantGroup = "promo";
  else if (shimmer > 0.5 && specular > 0.35) variantGroup = "reverse_holo";
  else if (specular > 0.45) variantGroup = "holo";
  else if (altArtBorder > 0.5) variantGroup = "alt_art";

  return {
    holoShine: specular,
    reverseHoloTexture: shimmer,
    promoStamp,
    altArtBorder,
    variantGroup,
  };
}
