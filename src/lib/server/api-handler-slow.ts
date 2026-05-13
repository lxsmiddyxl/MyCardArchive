/** Threshold for `mcaLog` slow-handler events (wall-clock, handler body only). */
export const API_SLOW_HANDLER_MS = 800;

export function shouldFlagSlowApiHandler(ms: number): boolean {
  return Number.isFinite(ms) && ms >= API_SLOW_HANDLER_MS;
}
