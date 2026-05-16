"use client";

import { trackProductClientEvent } from "@/lib/analytics/track-product-client";
import type { ProductAnalyticsEventName } from "@/lib/analytics/product-events";
import type { McaAnalyticsEventName } from "@/mca-utils/analytics/events";
import { isMcaAnalyticsEventName } from "@/mca-utils/analytics/events";
import { mcaLog } from "@/lib/logging/mca-log-client";

const CTX = { componentName: "mca.analytics", surfaceName: "analytics" } as const;

function toProductEvent(name: McaAnalyticsEventName): ProductAnalyticsEventName | null {
  switch (name) {
    case "page_view":
      return "pageview";
    case "onboarding_step":
    case "onboarding_complete":
      return "onboarding_step";
    default:
      return null;
  }
}

/** Client-side MCA analytics — structured log + product pipeline when mapped. */
export function trackMcaEvent(
  event: McaAnalyticsEventName,
  data: Readonly<Record<string, unknown>> = {}
): void {
  if (!isMcaAnalyticsEventName(event)) return;
  mcaLog.event(`analytics.${event}`, { ...data }, CTX);
  const productEvent = toProductEvent(event);
  if (productEvent) {
    trackProductClientEvent(productEvent, { mca_event: event, ...data });
  }
}
