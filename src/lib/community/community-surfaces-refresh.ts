import { scheduleCoalescedAnimationFrame } from "@/lib/client/coalesce-animation-frame";

/** Fire after community mutations so feed/detail surfaces can coalesce reloads. */
export const COMMUNITY_SURFACES_REFRESH_EVENT = "mca:community-surfaces-refresh";

export function requestCommunitySurfacesRefresh(): void {
  if (typeof window === "undefined") return;
  scheduleCoalescedAnimationFrame("mca:community-surface", () => {
    window.dispatchEvent(new CustomEvent(COMMUNITY_SURFACES_REFRESH_EVENT));
  });
}
