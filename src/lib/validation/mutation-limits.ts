/** Shared limits for POST/PATCH bodies — keep in sync with UI hints. */

export const MUTATION_LIMITS = {
  cardNameMax: 512,
  cardNumberMax: 64,
  rarityMax: 128,
  setNameMax: 256,
  imageUrlMax: 2048,
  tradeMessageMax: 8000,
} as const;

export function truncateForApi(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max);
}
