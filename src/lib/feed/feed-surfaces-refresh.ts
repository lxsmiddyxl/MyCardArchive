import { scheduleCoalescedAnimationFrame } from "@/lib/client/coalesce-animation-frame";

/** Fire after feed-related mutations so clients can coalesce soft reloads. */
export const FEED_SURFACES_REFRESH_EVENT = "mca:feed-surfaces-refresh";

export function requestFeedSurfacesRefresh(): void {
  if (typeof window === "undefined") return;
  scheduleCoalescedAnimationFrame("mca:feed-surface", () => {
    window.dispatchEvent(new CustomEvent(FEED_SURFACES_REFRESH_EVENT));
  });
}
