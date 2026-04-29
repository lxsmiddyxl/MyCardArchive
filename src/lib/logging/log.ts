/**
 * Lightweight structured logging. Intended for observability during development and
 * targeted production debugging via env (not high-volume analytics).
 *
 * - **Default:** logs only in `NODE_ENV === "development"`, at **info** threshold (hides `debug`).
 * - **Production:** set `LOG_LEVEL` (server) or `NEXT_PUBLIC_LOG_LEVEL` (client bundles) to
 *   `debug` | `info` | `warn` | `error` to enable logging at or above that level.
 *
 * Avoids work when disabled: level checks run before building messages.
 */

/* eslint-disable no-console -- this module is the single sanctioned console sink */

export type LogSubsystem = "realtime" | "presence" | "matching" | "notifications" | "trade";

type LogLevel = "debug" | "info" | "warn" | "error";

const RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function readThresholdFromEnv(): LogLevel | null {
  const raw =
    (typeof process.env.NEXT_PUBLIC_LOG_LEVEL === "string"
      ? process.env.NEXT_PUBLIC_LOG_LEVEL
      : undefined) ??
    (typeof process.env.LOG_LEVEL === "string" ? process.env.LOG_LEVEL : undefined);
  const s = raw?.trim().toLowerCase();
  if (s === "debug" || s === "info" || s === "warn" || s === "error") {
    return s;
  }
  return null;
}

function isLoggingActive(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return readThresholdFromEnv() !== null;
}

function threshold(): LogLevel {
  const explicit = readThresholdFromEnv();
  if (explicit) return explicit;
  if (process.env.NODE_ENV === "development") return "info";
  return "error";
}

function shouldEmit(level: LogLevel): boolean {
  if (!isLoggingActive()) return false;
  return RANK[level] >= RANK[threshold()];
}

function emit(
  subsystem: LogSubsystem,
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
): void {
  if (!shouldEmit(level)) return;
  const tag = `[${subsystem}]`;
  if (meta && Object.keys(meta).length > 0) {
    const line = `${tag} ${message}`;
    switch (level) {
      case "debug":
        console.debug(line, meta);
        break;
      case "info":
        console.info(line, meta);
        break;
      case "warn":
        console.warn(line, meta);
        break;
      case "error":
        console.error(line, meta);
        break;
      default:
        break;
    }
  } else {
    const line = `${tag} ${message}`;
    switch (level) {
      case "debug":
        console.debug(line);
        break;
      case "info":
        console.info(line);
        break;
      case "warn":
        console.warn(line);
        break;
      case "error":
        console.error(line);
        break;
      default:
        break;
    }
  }
}

function createLogger(subsystem: LogSubsystem) {
  return {
    debug: (message: string, meta?: Record<string, unknown>) =>
      emit(subsystem, "debug", message, meta),
    info: (message: string, meta?: Record<string, unknown>) =>
      emit(subsystem, "info", message, meta),
    warn: (message: string, meta?: Record<string, unknown>) =>
      emit(subsystem, "warn", message, meta),
    error: (message: string, meta?: Record<string, unknown>) =>
      emit(subsystem, "error", message, meta),
  };
}

export const log = {
  realtime: createLogger("realtime"),
  presence: createLogger("presence"),
  matching: createLogger("matching"),
  notifications: createLogger("notifications"),
  trade: createLogger("trade"),
} as const;
