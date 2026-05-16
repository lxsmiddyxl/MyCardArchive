/**
 * Launch analytics event names — privacy-safe payloads only (no PII, no raw card IDs).
 */
export const MCA_ANALYTICS_EVENTS = {
  page_view: "page_view",
  onboarding_step: "onboarding_step",
  onboarding_complete: "onboarding_complete",
  binder_open: "binder_open",
  binder_page_change: "binder_page_change",
  binder_slot_view: "binder_slot_view",
  scan_success: "scan_success",
  scan_failure: "scan_failure",
  profile_view: "profile_view",
  public_binder_view: "public_binder_view",
  embed_view: "embed_view",
} as const;

export type McaAnalyticsEventName =
  (typeof MCA_ANALYTICS_EVENTS)[keyof typeof MCA_ANALYTICS_EVENTS];

const EVENT_SET = new Set<string>(Object.values(MCA_ANALYTICS_EVENTS));

export function isMcaAnalyticsEventName(name: string): name is McaAnalyticsEventName {
  return EVENT_SET.has(name);
}
