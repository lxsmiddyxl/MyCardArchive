import { scheduleCoalescedAnimationFrame } from "@/lib/client/coalesce-animation-frame";

/** Fire after market mutations so discovery/engine/auto-match/watchlist consumers can soft-reload. */
export const MARKET_SURFACES_REFRESH_EVENT = "mca:market-surfaces-refresh";

export function requestMarketSurfacesRefresh(): void {
  if (typeof window === "undefined") return;
  scheduleCoalescedAnimationFrame("mca:market-surface", () => {
    window.dispatchEvent(new CustomEvent(MARKET_SURFACES_REFRESH_EVENT));
  });
}
