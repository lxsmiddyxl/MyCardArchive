import { mcaLog } from "@/lib/logging/mca-log-client";

export type ClientErrorCaptureContext = {
  route?: string;
  correlationId?: string;
  extra?: Record<string, unknown>;
};

const MCA_ERROR_TEL = { componentName: "mca.errors", surfaceName: "errors" } as const;

/** Client-only error capture (global-error, error boundaries). */
export function captureClientException(
  err: unknown,
  ctx: ClientErrorCaptureContext = {}
): void {
  const message = err instanceof Error ? err.message : String(err);
  mcaLog.error(
    "error.captured",
    {
      message,
      route: ctx.route ?? "client",
      correlationId: ctx.correlationId,
      ...ctx.extra,
    },
    MCA_ERROR_TEL
  );
  if (process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()) {
    mcaLog.event("error.sentry_forward", { route: ctx.route, hasDsn: true }, MCA_ERROR_TEL);
  }
}
