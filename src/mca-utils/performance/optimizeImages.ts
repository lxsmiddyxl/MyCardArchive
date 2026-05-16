/** Recommended `sizes` for marketing hero images (max-w-6xl layout). */
export const MARKETING_HERO_IMAGE_SIZES = "(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 960px";

/** Recommended `sizes` for marketing feature screenshots in a 2-column grid. */
export const MARKETING_FEATURE_IMAGE_SIZES = "(max-width: 768px) 100vw, 480px";

/** Priority only for above-the-fold marketing heroes. */
export function marketingImagePriority(aboveFold: boolean): boolean {
  return aboveFold;
}
