/**
 * Schedules work once per animation frame per key so synchronous bursts collapse to a single run.
 * Used by surface refresh dispatchers to avoid redundant listener churn.
 */

const scheduled = new Map<string, boolean>();

export function scheduleCoalescedAnimationFrame(key: string, fn: () => void): void {
  if (typeof window === "undefined") return;
  if (scheduled.get(key)) return;
  scheduled.set(key, true);
  requestAnimationFrame(() => {
    scheduled.delete(key);
    fn();
  });
}
