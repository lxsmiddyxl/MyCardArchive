import "server-only";

import { logServerError } from "@/lib/server/observability";
import { mcaLog } from "@/lib/logging/mca-log-server";

export type ServerErrorCaptureContext = {
  scope?: "api" | "ssr" | "middleware" | "system";
  route?: string;
  userId?: string | null;
  correlationId?: string;
  extra?: Record<string, unknown>;
};

const MCA_ERROR_TEL = { componentName: "mca.errors", surfaceName: "errors" } as const;

/** Server-only error capture for API routes and SSR. */
export function captureServerException(
  err: unknown,
  ctx: ServerErrorCaptureContext = {}
): void {
  const scope =
    ctx.scope === "api"
      ? "api"
      : ctx.scope === "ssr"
        ? "ssr"
        : ctx.scope === "middleware"
          ? "middleware"
          : "system";
  const route = ctx.route ?? "unknown";

  logServerError({
    scope,
    route,
    userId: ctx.userId,
    err,
    correlationId: ctx.correlationId,
  });

  if (process.env.SENTRY_DSN?.trim()) {
    mcaLog.event(
      "error.sentry_forward",
      { route, hasDsn: true, correlationId: ctx.correlationId },
      MCA_ERROR_TEL
    );
  }
}
