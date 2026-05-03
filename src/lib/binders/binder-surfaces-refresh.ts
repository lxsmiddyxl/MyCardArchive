import { scheduleCoalescedAnimationFrame } from "@/lib/client/coalesce-animation-frame";

/** Fire after binder mutations so BinderBook / rail / grid can reload slots without a full navigation. */
export const BINDER_SURFACES_REFRESH_EVENT = "mca:binder-surfaces-refresh";

export type BinderSurfacesRefreshDetail = {
  /** When set, only that binder's surfaces should reload; omit for a global binder refresh. */
  binderId?: string;
};

let pendingBinderId: string | undefined;

export function requestBinderSurfacesRefresh(binderId?: string): void {
  if (typeof window === "undefined") return;
  pendingBinderId = binderId ?? pendingBinderId;
  scheduleCoalescedAnimationFrame("mca:binder-surface", () => {
    const bid = pendingBinderId;
    pendingBinderId = undefined;
    window.dispatchEvent(
      new CustomEvent<BinderSurfacesRefreshDetail>(BINDER_SURFACES_REFRESH_EVENT, {
        detail: { binderId: bid },
      })
    );
  });
}
