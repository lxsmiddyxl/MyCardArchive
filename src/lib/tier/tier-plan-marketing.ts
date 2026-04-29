/** Marketing lines for pricing surfaces — not used for enforcement. */

export const TIER_PLAN_TAGLINE = {
  free: "Perfect for casual collectors.",
  pro: "Power tools for serious collectors.",
  elite: "Unlimited performance for high-volume users.",
  business: "Built for shops, graders, and high-volume sellers.",
} as const;

export type PlanSlug = keyof typeof TIER_PLAN_TAGLINE;
