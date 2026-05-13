"use client";

import type { ProductAnalyticsEventName } from "@/lib/analytics/product-events";
import { mcaLog } from "@/lib/logging/mca-log-client";

const CTX = { componentName: "product.analytics", surfaceName: "product" } as const;

/** Client-side product events (no PII in `data`). */
export function trackProductClientEvent(
  event: ProductAnalyticsEventName,
  data: Readonly<Record<string, unknown>> = {}
): void {
  mcaLog.event(`product.${event}`, { ...data }, CTX);
}
