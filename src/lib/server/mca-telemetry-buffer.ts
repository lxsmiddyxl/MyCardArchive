import "server-only";

import type { McaLogEnvelope } from "@/lib/logging/types";

const MAX = 200;
const buffer: McaLogEnvelope[] = [];

export function pushMcaTelemetry(env: McaLogEnvelope): void {
  buffer.push(env);
  if (buffer.length > MAX) buffer.splice(0, buffer.length - MAX);
  if (process.env.NODE_ENV === "development") {
    console.debug("[MCA telemetry]", JSON.stringify(env));
  }
}

export function getRecentMcaTelemetry(): readonly McaLogEnvelope[] {
  return [...buffer];
}

/** Age in ms of the most recent buffered envelope, or `null` if empty. */
export function getLastMcaTelemetryEventAgeMs(): number | null {
  if (buffer.length === 0) return null;
  const last = buffer[buffer.length - 1];
  return Math.max(0, Date.now() - last.ts);
}

export function clearMcaTelemetryForTests(): void {
  buffer.length = 0;
}

/** Recovery: fresh heartbeat so stall age reflects post-recovery state (idempotent). */
export function injectRecoveryTelemetryHeartbeat(reason: string): void {
  pushMcaTelemetry({
    level: "event",
    name: "recoveryTelemetry.heartbeat",
    data: { reason },
    ts: Date.now(),
    componentName: "recovery",
    surfaceName: "engine",
  });
}

/** Recent envelopes whose name suggests Suspense waterfall timings (for dev diagnostics). */
export function getRecentSuspenseWaterfallEnvelopes(): readonly McaLogEnvelope[] {
  return buffer.filter(
    (e) =>
      typeof e.name === "string" &&
      e.name.includes("waterfall") &&
      e.name.startsWith("suspense.")
  );
}
