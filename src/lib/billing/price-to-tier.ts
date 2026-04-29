export type PaidTierSlug = "pro" | "elite" | "business";

const cache: { map: Record<string, PaidTierSlug> | null } = { map: null };

function buildPriceTierMap(): Record<string, PaidTierSlug> {
  if (cache.map) {
    return cache.map;
  }
  const m: Record<string, PaidTierSlug> = {};
  const pairs: [string | undefined, PaidTierSlug][] = [
    [process.env.STRIPE_PRICE_PRO?.trim(), "pro"],
    [process.env.STRIPE_PRICE_ELITE?.trim(), "elite"],
    [process.env.STRIPE_PRICE_BUSINESS?.trim(), "business"],
    [process.env.STRIPE_PRICE_PRO_YEARLY?.trim(), "pro"],
    [process.env.STRIPE_PRICE_ELITE_YEARLY?.trim(), "elite"],
    [process.env.STRIPE_PRICE_BUSINESS_YEARLY?.trim(), "business"],
  ];
  for (const [id, tier] of pairs) {
    if (id) {
      m[id] = tier;
    }
  }
  cache.map = m;
  return m;
}

/** Reset cache (e.g. in tests). */
export function resetPriceTierCache(): void {
  cache.map = null;
}

export function tierSlugFromStripePriceId(
  priceId: string | undefined | null
): PaidTierSlug | null {
  if (!priceId) {
    return null;
  }
  return buildPriceTierMap()[priceId] ?? null;
}

export function stripePriceIdForPaidTier(tier: PaidTierSlug): string | null {
  const t = tier.trim().toLowerCase() as PaidTierSlug;
  const id =
    t === "pro"
      ? process.env.STRIPE_PRICE_PRO?.trim()
      : t === "elite"
        ? process.env.STRIPE_PRICE_ELITE?.trim()
        : process.env.STRIPE_PRICE_BUSINESS?.trim();
  return id && id.length > 0 ? id : null;
}
