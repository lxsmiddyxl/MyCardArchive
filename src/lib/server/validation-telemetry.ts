import "server-only";

import { logger } from "@/lib/telemetry/logger";

export function logApiValidationFailure(route: string, field: string, code: string): void {
  logger.warn({
    eventType: "validation.failed",
    success: false,
    payloadSummary: { route, field, code },
  });
}
