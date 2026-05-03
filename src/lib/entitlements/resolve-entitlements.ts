import { maxBinderPagesForTierSlug } from "@/lib/binders/page-limits";
import type { EntitlementDTO, EntitlementLimitsDTO, EntitlementTierDTO } from "@/lib/dto/entitlements";
import { isCurrentUserInternalUnlimited } from "@/lib/entitlements/internal-unlimited";
import { maxDecksForTierSlug } from "@/lib/decks/limits";
import {
  getEffectiveUserTier,
  getUserTier,
  isUnlimitedScans,
  type AppSupabaseClient,
} from "@/lib/tier/check-limits";

function capFromTierLimit(n: number): number | null {
  return n <= 0 ? null : n;
}

function mapMarketingTier(slug: string): EntitlementTierDTO {
  const s = slug.trim().toLowerCase();
  if (s === "free") return "free";
  if (s === "pro") return "pro";
  if (s === "elite") return "plus";
  if (s === "business") return "plus";
  return "free";
}

function buildLimitsFromEffectiveTier(
  displaySlug: string,
  effective: NonNullable<Awaited<ReturnType<typeof getEffectiveUserTier>>>
): EntitlementLimitsDTO {
  const pages = maxBinderPagesForTierSlug(displaySlug);
  const decks = maxDecksForTierSlug(displaySlug);
  return {
    maxBinders: capFromTierLimit(effective.binder_limit),
    maxCards: capFromTierLimit(effective.card_limit),
    maxDecks: decks,
    maxBinderPagesPerBinder: pages,
    maxOffers: null,
    maxRooms: null,
    maxFeedSaves: null,
    maxScansPerMonth: isUnlimitedScans(effective.scan_limit) ? null : effective.scan_limit,
  };
}

/**
 * Server-only resolver — uses RLS-scoped Supabase client for the active session.
 */
export async function resolveEntitlements(
  client: AppSupabaseClient
): Promise<EntitlementDTO | null> {
  const baseTier = await getUserTier(client);
  if (!baseTier) return null;

  const effective = await getEffectiveUserTier(client);
  if (!effective) return null;

  const displaySlug = baseTier.tier_slug;

  if (await isCurrentUserInternalUnlimited(client)) {
    const unlimited: EntitlementLimitsDTO = {
      maxBinders: null,
      maxCards: null,
      maxDecks: null,
      maxBinderPagesPerBinder: null,
      maxOffers: null,
      maxRooms: null,
      maxFeedSaves: null,
      maxScansPerMonth: null,
    };
    return {
      tier: "internal_unlimited",
      displayTierSlug: displaySlug,
      suppressCommercialUi: true,
      limits: unlimited,
    };
  }

  return {
    tier: mapMarketingTier(displaySlug),
    displayTierSlug: displaySlug,
    suppressCommercialUi: false,
    limits: buildLimitsFromEffectiveTier(displaySlug, effective),
  };
}
