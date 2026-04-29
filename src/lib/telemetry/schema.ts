/**
 * Structured event shape for **minute-bucket aggregation** (`recordTelemetryEvent`) and the
 * server-only Pino bridge in `telemetry/logger.ts`.
 *
 * **Phase 46 client/server logs** use `McaLogEnvelope` (`lib/logging/types.ts`) posted to
 * `POST /api/log`; the route handler mirrors each accepted envelope into aggregation via
 * `buildEvent` for `GET /api/internal/telemetry` snapshots.
 */
export type StructuredLogEvent = {
  eventType: string;
  userId?: string;
  timestamp: string;
  payloadSummary?: unknown;
  latencyMs?: number;
  success: boolean;
};

export function nowIso(): string {
  return new Date().toISOString();
}

export function buildEvent(
  partial: Omit<StructuredLogEvent, "timestamp"> & { timestamp?: string }
): StructuredLogEvent {
  return {
    timestamp: partial.timestamp ?? nowIso(),
    eventType: partial.eventType,
    userId: partial.userId,
    payloadSummary: partial.payloadSummary,
    latencyMs: partial.latencyMs,
    success: partial.success,
  };
}
