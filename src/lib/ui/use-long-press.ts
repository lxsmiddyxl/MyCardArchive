"use client";

import { useCallback, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

export type LongPressOptions = {
  /** Default 500ms */
  durationMs?: number;
};

/**
 * Gesture-friendly long-press handler (mobile / trackpad).
 * Fires `onLongPress` once if the pointer stays down for `durationMs` without moving past a small threshold.
 */
export function useLongPress(
  onLongPress: (() => void) | undefined,
  options?: LongPressOptions
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const durationMs = options?.durationMs ?? 500;

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<Element>) => {
      if (!onLongPress) return;
      startRef.current = { x: e.clientX, y: e.clientY };
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        onLongPress();
      }, durationMs);
    },
    [durationMs, onLongPress]
  );

  const onPointerMove = useCallback((e: ReactPointerEvent<Element>) => {
    if (!startRef.current || !timerRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (dx * dx + dy * dy > 100) {
      clear();
    }
  }, [clear]);

  const onPointerUp = useCallback(() => {
    clear();
  }, [clear]);

  const onPointerCancel = useCallback(() => {
    clear();
  }, [clear]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };
}
