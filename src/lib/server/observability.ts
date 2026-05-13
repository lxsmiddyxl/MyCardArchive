/**
 * Server-side observability: structured logs + in-memory ring buffer for /dev/logs.
 * Never log passwords, tokens, Authorization headers, or full request bodies.
 */

export type ServerLogEntry = {
  ts: string;
  scope: "api" | "ssr" | "middleware" | "system";
  route: string;
  userId?: string;
  message: string;
  stack?: string;
};

const MAX_BUFFER = 250;
const buffer: ServerLogEntry[] = [];

function truncate(s: string, max = 500): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

/** Strip common secret patterns from accidental logging. */
export function sanitizeMessage(message: string): string {
  return message
    .replace(/Bearer\s+[\w-_.+/=]+/gi, "Bearer [redacted]")
    .replace(/apikey["']?\s*[:=]\s*["'][^"']+["']/gi, 'apikey: "[redacted]"')
    .replace(/password["']?\s*[:=]\s*["'][^"']*["']/gi, 'password: "[redacted]"');
}

export function errorToParts(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) {
    return {
      message: sanitizeMessage(truncate(err.message)),
      stack: err.stack ? sanitizeMessage(truncate(err.stack, 4000)) : undefined,
    };
  }
  return { message: sanitizeMessage(truncate(String(err))) };
}

/**
 * Next.js throws this during static generation when a route uses cookies/headers
 * but something still attempted to prerender it. Not an application failure.
 */
function isNextDynamicServerUsageError(err: unknown): boolean {
  if (err && typeof err === "object" && "digest" in err) {
    const d = (err as { digest?: string }).digest;
    if (d === "DYNAMIC_SERVER_USAGE") return true;
  }
  if (err instanceof Error) {
    return err.message.includes("Dynamic server usage");
  }
  return false;
}

export function pushLog(entry: Omit<ServerLogEntry, "ts"> & { ts?: string }): void {
  const full: ServerLogEntry = {
    ts: entry.ts ?? new Date().toISOString(),
    scope: entry.scope,
    route: entry.route,
    userId: entry.userId,
    message: sanitizeMessage(entry.message),
    stack: entry.stack ? sanitizeMessage(entry.stack) : undefined,
  };
  buffer.push(full);
  if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);

  const line = `[${full.ts}] ${full.scope} ${full.route}${full.userId ? ` user=${full.userId}` : ""} ${full.message}`;
  if (full.stack) {
    console.error(line, "\n", full.stack);
  } else {
    console.error(line);
  }
}

export function logServerError(opts: {
  scope: ServerLogEntry["scope"];
  route: string;
  userId?: string | null;
  err: unknown;
  /** Optional request correlation id (API envelope `context_id` or `x-mca-context-id`). */
  correlationId?: string;
}): void {
  if (isNextDynamicServerUsageError(opts.err)) return;

  const { message, stack } = errorToParts(opts.err);
  const prefix = opts.correlationId ? `ctx=${opts.correlationId} ` : "";
  pushLog({
    scope: opts.scope,
    route: opts.route,
    userId: opts.userId ?? undefined,
    message: prefix + message,
    stack,
  });
}

export function getRecentLogs(): readonly ServerLogEntry[] {
  return [...buffer];
}

export function clearLogsForTests(): void {
  buffer.length = 0;
}
