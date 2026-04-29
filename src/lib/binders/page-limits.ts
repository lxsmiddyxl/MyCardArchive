import {
  getUserTier,
  type AppSupabaseClient,
} from "@/lib/tier/check-limits";

/**
 * Maximum binder pages per tier (product tuning; not stored in DB).
 * Tier system today exposes binder *count*, not pages — this caps pages per binder.
 */
export function maxBinderPagesForTierSlug(slug: string | null | undefined): number {
  const s = (slug ?? "free").toLowerCase().trim();
  if (s === "elite") return 200;
  if (s === "pro") return 80;
  return 24;
}

export async function getMaxBinderPagesForUser(
  client: AppSupabaseClient
): Promise<number> {
  try {
    const tier = await getUserTier(client);
    return maxBinderPagesForTierSlug(tier?.tier_slug ?? "free");
  } catch {
    return maxBinderPagesForTierSlug("free");
  }
}
