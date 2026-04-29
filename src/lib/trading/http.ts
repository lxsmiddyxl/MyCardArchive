/**
 * Maps `src/lib/trading/db.ts` error strings to HTTP status codes for API routes.
 */
export function tradeDbErrorStatus(error: string): number {
  const e = error.trim();
  if (e.includes("Forbidden")) return 403;
  if (e.includes("Unauthorized")) return 401;
  if (e.includes("not found") || e === "Trade not found." || e === "Trade not found") {
    return 404;
  }
  return 400;
}
