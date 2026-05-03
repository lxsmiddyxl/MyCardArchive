/**
 * Resolved entitlement caps for the signed-in user (`GET /api/entitlements`).
 * `null` numeric caps mean unlimited for that dimension.
 */

export type EntitlementTierDTO = "free" | "plus" | "pro" | "internal_unlimited";

export type EntitlementLimitsDTO = {
  maxBinders: number | null;
  maxCards: number | null;
  maxDecks: number | null;
  maxBinderPagesPerBinder: number | null;
  maxOffers: number | null;
  maxRooms: number | null;
  maxFeedSaves: number | null;
  maxScansPerMonth: number | null;
};

/** Primary payload for clients — never includes other users’ internal flags. */
export type EntitlementDTO = {
  tier: EntitlementTierDTO;
  /** Catalog / Stripe slug from `user_tiers` — safe for badges shown to others. */
  displayTierSlug: string;
  /** Hide checkout, scan packs, and upgrade prompts (internal unlimited only). */
  suppressCommercialUi: boolean;
  limits: EntitlementLimitsDTO;
};

/** Stripe / billing panel surfaces. */
export type BillingStatusDTO = {
  stripeCheckoutAvailable: boolean;
  hasStripeCustomer: boolean;
  billingEnabled: boolean;
};

export type BillingMutationResponseDTO = {
  url?: string;
  error?: string;
  success?: boolean;
};
