import "server-only";

import type { ProductAnalyticsEventName } from "@/lib/analytics/product-events";
import { mcaLog } from "@/lib/logging/mca-log-server";

const CTX = { componentName: "product.analytics", surfaceName: "product" } as const;

/**
 * Server-side product funnel / behavior events. Keep `data` free of PII and free-form user text.
 */
export function trackProductServerEvent(
  userId: string,
  event: ProductAnalyticsEventName,
  data: Readonly<Record<string, unknown>> = {}
): void {
  mcaLog.event(`product.${event}`, { userId, ...data }, CTX);
}
