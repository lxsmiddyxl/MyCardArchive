/**
 * One-time scan pack add-ons — single source of truth for sizes and display pricing.
 *
 * Optional Stripe Price IDs (one-time prices in Dashboard):
 *   STRIPE_PRICE_SCAN_PACK_SMALL | MEDIUM | LARGE
 *
 * Optional unit overrides (integer cents) without creating Stripe prices:
 *   SCAN_PACK_SMALL_PRICE_CENTS, SCAN_PACK_MEDIUM_PRICE_CENTS, SCAN_PACK_LARGE_PRICE_CENTS
 *
 * If no price ID is set, Checkout uses inline `price_data` with `fallbackPriceCents` / env cents.
 */

export const SCAN_PACK_IDS = ["small", "medium", "large"] as const;
export type ScanPackId = (typeof SCAN_PACK_IDS)[number];

export function isScanPackId(s: string): s is ScanPackId {
  return (SCAN_PACK_IDS as readonly string[]).includes(s);
}

export type ScanPackDefinition = {
  id: ScanPackId;
  /** Extra scans granted when the pack is purchased. */
  bonusScans: number;
  label: string;
  blurb: string;
  /** Fallback one-time price in USD cents when no Stripe Price ID is set. */
  fallbackPriceCents: number;
};

const PACKS: readonly ScanPackDefinition[] = [
  {
    id: "small",
    bonusScans: 250,
    label: "Small pack",
    blurb: "+250 scans",
    fallbackPriceCents: 9_99,
  },
  {
    id: "medium",
    bonusScans: 500,
    label: "Medium pack",
    blurb: "+500 scans",
    fallbackPriceCents: 17_99,
  },
  {
    id: "large",
    bonusScans: 1000,
    label: "Large pack",
    blurb: "+1,000 scans",
    fallbackPriceCents: 29_99,
  },
] as const;

const byId: Record<ScanPackId, ScanPackDefinition> = {
  small: PACKS[0],
  medium: PACKS[1],
  large: PACKS[2],
};

export function listScanPackDefinitions(): readonly ScanPackDefinition[] {
  return PACKS;
}

export function getScanPackDefinition(id: ScanPackId): ScanPackDefinition {
  return byId[id];
}

/** Stripe Price ID for recurring-style catalog (optional). */
export function stripePriceIdForScanPack(id: ScanPackId): string | null {
  const key =
    id === "small"
      ? "STRIPE_PRICE_SCAN_PACK_SMALL"
      : id === "medium"
        ? "STRIPE_PRICE_SCAN_PACK_MEDIUM"
        : "STRIPE_PRICE_SCAN_PACK_LARGE";
  const v = process.env[key]?.trim();
  return v && v.length > 0 ? v : null;
}

/**
 * Unit amount (cents) for Checkout when no Stripe Price ID is configured.
 * Env override: SCAN_PACK_SMALL_PRICE_CENTS, etc.
 */
export function effectiveScanPackUnitCents(id: ScanPackId): number {
  const def = getScanPackDefinition(id);
  const envKey =
    id === "small"
      ? "SCAN_PACK_SMALL_PRICE_CENTS"
      : id === "medium"
        ? "SCAN_PACK_MEDIUM_PRICE_CENTS"
        : "SCAN_PACK_LARGE_PRICE_CENTS";
  const raw = process.env[envKey]?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }
  return def.fallbackPriceCents;
}
