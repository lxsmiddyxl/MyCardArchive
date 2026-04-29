/**
 * Stroke widths — aligns with Phase 23 icon language (1.75) and hairlines in UI chrome.
 * Use numeric values in SVG props; use Tailwind `stroke-[1.75]` where applicable.
 */
export const strokeWidth = {
  /** Default UI / icon stroke (matches icon pack) */
  icon: 1.75,
  hairline: 1,
  strong: 2,
} as const;
