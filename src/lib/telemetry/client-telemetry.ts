/**
 * Browser-only helpers for realtime channel identity.
 * Structured client observability uses Phase 46 {@link mcaLog} (`mca-log-client.ts`) → `POST /api/log`.
 */

"use client";

const TAB_CONNECTION_ID =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Stable id per tab for correlating realtime presence / mux events in logs. */
export function getTelemetryConnectionId(): string {
  return TAB_CONNECTION_ID;
}
