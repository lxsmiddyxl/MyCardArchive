import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, withContextId } from "@/lib/api/route-helpers";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { shouldFlagSlowApiHandler } from "@/lib/server/api-handler-slow";
import { logServerError } from "@/lib/server/observability";
import { captureServerException } from "@/mca-utils/errors/capture-server";
import { logApiTiming, traceIdFromRequest } from "@/mca-utils/logging/trace";

const MCA_API_TEL = { componentName: "defineRoute", surfaceName: "api" } as const;

function recordSlowApiHandler(routeLabel: string, startedMs: number) {
  const ms = Date.now() - startedMs;
  if (!shouldFlagSlowApiHandler(ms)) return;
  mcaLog.event("api.slow_handler", { route: routeLabel, ms }, MCA_API_TEL);
}

type RouteHandler = (
  request: Request,
  context: { params: Record<string, string> }
) => Promise<Response>;

/**
 * Wraps a Route Handler with try/catch logging. Use for App Router `route.ts` exports.
 * Dynamic segment names are normalized in `routeLabel` (e.g. `GET /api/decks/[deckId]/summary`).
 */
export function defineRoute(
  routeLabel: string,
  handler: RouteHandler
): (request: Request, context: { params: Record<string, string> }) => Promise<Response> {
  return async (request, context) => {
    const started = Date.now();
    const errorCtx = withContextId();
    const traceId = traceIdFromRequest(request);
    try {
      const res = await handler(request, context);
      recordSlowApiHandler(routeLabel, started);
      logApiTiming(routeLabel, Date.now() - started, traceId);
      return res;
    } catch (err) {
      logServerError({
        scope: "api",
        route: routeLabel,
        err,
        correlationId: errorCtx.contextId,
      });
      captureServerException(err, {
        scope: "api",
        route: routeLabel,
        correlationId: errorCtx.contextId,
      });
      return errorJson(errorCtx, "Internal server error", 500, { code: ApiErrorCode.INTERNAL });
    }
  };
}

/** For routes with no `params` in signature (Next may still pass empty object). */
export function defineRouteSimple(
  routeLabel: string,
  handler: (request: Request) => Promise<Response>
): (request: Request, context?: { params: Record<string, string> }) => Promise<Response> {
  return async (request, _context) => {
    const started = Date.now();
    const errorCtx = withContextId();
    const traceId = traceIdFromRequest(request);
    try {
      const res = await handler(request);
      recordSlowApiHandler(routeLabel, started);
      logApiTiming(routeLabel, Date.now() - started, traceId);
      return res;
    } catch (err) {
      logServerError({
        scope: "api",
        route: routeLabel,
        err,
        correlationId: errorCtx.contextId,
      });
      captureServerException(err, {
        scope: "api",
        route: routeLabel,
        correlationId: errorCtx.contextId,
      });
      return errorJson(errorCtx, "Internal server error", 500, { code: ApiErrorCode.INTERNAL });
    }
  };
}

/** For GET/HEAD handlers with no Request usage. */
export function defineRouteNoArgs(
  routeLabel: string,
  handler: () => Promise<Response>
): () => Promise<Response> {
  return async () => {
    const started = Date.now();
    const errorCtx = withContextId();
    try {
      const res = await handler();
      recordSlowApiHandler(routeLabel, started);
      logApiTiming(routeLabel, Date.now() - started, errorCtx.contextId);
      return res;
    } catch (err) {
      logServerError({
        scope: "api",
        route: routeLabel,
        err,
        correlationId: errorCtx.contextId,
      });
      captureServerException(err, {
        scope: "api",
        route: routeLabel,
        correlationId: errorCtx.contextId,
      });
      return errorJson(errorCtx, "Internal server error", 500, { code: ApiErrorCode.INTERNAL });
    }
  };
}
