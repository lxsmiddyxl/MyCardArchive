/**
 * Trailing debounce for `router.refresh()` so mutation bursts issue one RSC invalidation.
 */

let timer: number | null = null;

export function scheduleCoalescedRouterRefresh(router: { refresh: () => void }): void {
  if (typeof window === "undefined") return;
  if (timer !== null) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    router.refresh();
  }, 120);
}
