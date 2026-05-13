/** Stable product analytics keys (Phase 61) — keep aligned with tests and dashboards. */
export const PRODUCT_ANALYTICS_EVENTS = [
  "pageview",
  "binder_create",
  "deck_create",
  "trade_create",
  "profile_edit",
  "onboarding_step",
] as const;

export type ProductAnalyticsEventName = (typeof PRODUCT_ANALYTICS_EVENTS)[number];

export function isProductAnalyticsEventName(v: string): v is ProductAnalyticsEventName {
  return (PRODUCT_ANALYTICS_EVENTS as readonly string[]).includes(v);
}
