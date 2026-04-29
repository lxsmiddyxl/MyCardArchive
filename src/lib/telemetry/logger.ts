/**
 * Centralized structured logger (Pino) + telemetry aggregation hook.
 * Server-only — browser code uses `mca-log-client` → `POST /api/log`.
 */
import "server-only";

import { recordTelemetryEvent } from "@/lib/telemetry/aggregation";
import { buildEvent, type StructuredLogEvent } from "@/lib/telemetry/schema";
import pino from "pino";

const root = pino({
  level:
    (typeof process.env.LOG_LEVEL === "string" && process.env.LOG_LEVEL) ||
    (process.env.NODE_ENV === "development" ? "debug" : "info"),
  base: undefined,
});

type Input = Omit<StructuredLogEvent, "timestamp"> & { timestamp?: string };

function toEvent(input: Input): StructuredLogEvent {
  return buildEvent(input);
}

function write(level: "debug" | "info" | "warn" | "error", input: Input): void {
  const event = toEvent(input);
  recordTelemetryEvent(event);
  root[level](event);
}

/** Structured logger — every record follows {@link StructuredLogEvent}. */
export const logger = {
  debug: (input: Input) => write("debug", input),
  info: (input: Input) => write("info", input),
  warn: (input: Input) => write("warn", input),
  error: (input: Input) => write("error", input),
};

export type { StructuredLogEvent } from "@/lib/telemetry/schema";
