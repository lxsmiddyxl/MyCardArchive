/**
 * Phase 89 — button-driven gesture-like affordances (safe, no native gesture hijacking).
 */

export type GestureAffordanceId = "swipe_refresh" | "pull_archive" | "quick_dismiss";

export const GESTURE_AFFORDANCES: Record<
  GestureAffordanceId,
  { label: string; hint: string }
> = {
  swipe_refresh: {
    label: "Refresh list",
    hint: "Tap to reload the latest cards and offers.",
  },
  pull_archive: {
    label: "Open archive",
    hint: "Jump to your binders without losing scroll position.",
  },
  quick_dismiss: {
    label: "Dismiss banner",
    hint: "Hide offline or sync hints for this session.",
  },
};

export function gestureTelemetryPayload(id: GestureAffordanceId): { gestureId: GestureAffordanceId } {
  return { gestureId: id };
}
