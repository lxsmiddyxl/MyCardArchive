import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, withContextId } from "@/lib/api/route-helpers";
import { logServerError } from "@/lib/server/observability";

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
    try {
      return await handler(request, context);
    } catch (err) {
      logServerError({ scope: "api", route: routeLabel, err });
      const ctx = withContextId();
      return errorJson(ctx, "Internal server error", 500, { code: ApiErrorCode.INTERNAL });
    }
  };
}

/** For routes with no `params` in signature (Next may still pass empty object). */
export function defineRouteSimple(
  routeLabel: string,
  handler: (request: Request) => Promise<Response>
): (request: Request, context?: { params: Record<string, string> }) => Promise<Response> {
  return async (request, _context) => {
    try {
      return await handler(request);
    } catch (err) {
      logServerError({ scope: "api", route: routeLabel, err });
      const ctx = withContextId();
      return errorJson(ctx, "Internal server error", 500, { code: ApiErrorCode.INTERNAL });
    }
  };
}

/** For GET/HEAD handlers with no Request usage. */
export function defineRouteNoArgs(
  routeLabel: string,
  handler: () => Promise<Response>
): () => Promise<Response> {
  return async () => {
    try {
      return await handler();
    } catch (err) {
      logServerError({ scope: "api", route: routeLabel, err });
      const ctx = withContextId();
      return errorJson(ctx, "Internal server error", 500, { code: ApiErrorCode.INTERNAL });
    }
  };
}
