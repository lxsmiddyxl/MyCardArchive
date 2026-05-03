import { scheduleCoalescedAnimationFrame } from "@/lib/client/coalesce-animation-frame";
import { FEED_SURFACES_REFRESH_EVENT } from "@/lib/feed/feed-surfaces-refresh";

/** Fire after follow/unfollow, profile edits, or graph refreshes so profile strips, rooms, and feeds stay aligned. */
export const SOCIAL_SURFACES_REFRESH_EVENT = "mca:social-surfaces-refresh";

export type SocialSurfacesRefreshDetail = {
  /** Subject profile user id when viewers should bias refresh (optional filter for future listeners). */
  userId?: string;
};

let mergedSocialDetail: SocialSurfacesRefreshDetail = {};

export function requestSocialSurfacesRefresh(detail?: SocialSurfacesRefreshDetail): void {
  if (typeof window === "undefined") return;
  mergedSocialDetail = { ...mergedSocialDetail, ...detail };
  scheduleCoalescedAnimationFrame("mca:social-surface", () => {
    const d = mergedSocialDetail;
    mergedSocialDetail = {};
    window.dispatchEvent(
      new CustomEvent<SocialSurfacesRefreshDetail>(SOCIAL_SURFACES_REFRESH_EVENT, {
        detail: d,
      })
    );
    window.dispatchEvent(new CustomEvent(FEED_SURFACES_REFRESH_EVENT));
  });
}
