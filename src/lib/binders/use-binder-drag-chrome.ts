"use client";

import { useEffect, useRef, type RefObject } from "react";

const EDGE_PX = 56;
const HOLD_MS = 420;
const SCROLL_STEP = 14;
const EDGE_MARGIN_PX = 72;

export type BinderDragChromeOpts = {
  /** False while HTTP mutation is in flight — avoids accidental page turns. */
  busy: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  /** Drop target region used for horizontal edge detection (binder shell). */
  binderShellRef: RefObject<HTMLElement | null>;
};

/**
 * During HTML5 drag: window vertical auto-scroll and timed prev/next page when the pointer
 * lingers near the left/right edge of the binder shell (Binder 3.0).
 */
export function useBinderDragChrome(opts: BinderDragChromeOpts): void {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const edgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const edgeSideRef = useRef<"left" | "right" | null>(null);
  const lastFlipAtRef = useRef(0);

  useEffect(() => {
    const clearEdge = () => {
      if (edgeTimerRef.current) {
        clearTimeout(edgeTimerRef.current);
        edgeTimerRef.current = null;
      }
      edgeSideRef.current = null;
    };

    const scheduleFlip = (side: "left" | "right") => {
      const o = optsRef.current;
      if (o.busy) return;
      if (side === "left" && !o.canGoPrev) return;
      if (side === "right" && !o.canGoNext) return;

      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (now - lastFlipAtRef.current < 280) return;

      if (edgeSideRef.current !== side) {
        clearEdge();
        edgeSideRef.current = side;
        edgeTimerRef.current = setTimeout(() => {
          edgeTimerRef.current = null;
          const cur = optsRef.current;
          if (cur.busy) return;
          lastFlipAtRef.current =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          if (side === "left" && cur.canGoPrev) cur.onPrevPage();
          else if (side === "right" && cur.canGoNext) cur.onNextPage();
          edgeSideRef.current = null;
        }, HOLD_MS);
      }
    };

    const onDragOver = (e: DragEvent) => {
      const o = optsRef.current;
      if (o.busy) {
        clearEdge();
        return;
      }

      const y = e.clientY;
      const vh = window.innerHeight;
      if (y < EDGE_MARGIN_PX) {
        window.scrollBy({ top: -SCROLL_STEP, left: 0, behavior: "auto" });
      } else if (y > vh - EDGE_MARGIN_PX) {
        window.scrollBy({ top: SCROLL_STEP, left: 0, behavior: "auto" });
      }

      const shell = o.binderShellRef.current;
      if (!shell) {
        clearEdge();
        return;
      }
      const rect = shell.getBoundingClientRect();
      const x = e.clientX;
      if (x >= rect.left && x <= rect.left + EDGE_PX) {
        scheduleFlip("left");
      } else if (x <= rect.right && x >= rect.right - EDGE_PX) {
        scheduleFlip("right");
      } else {
        clearEdge();
      }
    };

    const onDragEnd = () => {
      clearEdge();
    };

    document.addEventListener("dragover", onDragOver);
    document.addEventListener("dragend", onDragEnd);
    document.addEventListener("drop", onDragEnd);
    return () => {
      clearEdge();
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("dragend", onDragEnd);
      document.removeEventListener("drop", onDragEnd);
    };
  }, []);
}
