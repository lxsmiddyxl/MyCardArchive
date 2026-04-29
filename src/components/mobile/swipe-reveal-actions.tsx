"use client";

import { cn } from "@/lib/ui/cn";
import { mcaLog } from "@/lib/logging/mca-log-client";
import type { ReactNode } from "react";
import { useCallback, useRef, useState } from "react";

type Props = {
  /** Width of the revealed action rail in px */
  revealWidth?: number;
  /** Back-layer actions (buttons) */
  actions: ReactNode;
  children: ReactNode;
  surface: "binder-slot" | "deck-zone-row";
  className?: string;
};

/**
 * Horizontal swipe-to-reveal for touch-first surfaces (Phase 64).
 */
export function SwipeRevealActions({
  revealWidth = 96,
  actions,
  children,
  surface,
  className,
}: Props) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const active = useRef(false);

  const logGesture = useCallback(
    (kind: "swipe_reveal_open" | "swipe_reveal_close") => {
      mcaLog.event(
        "mobile.gesture",
        { kind, surface },
        { componentName: "SwipeRevealActions", surfaceName: "mobile" }
      );
    },
    [surface]
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    /** Left ~28% of the cell starts a horizontal reveal; center/right taps still open the card. */
    if (relX > rect.width * 0.28) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    active.current = true;
    setDragging(true);
    el.setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!active.current || startX.current == null || startY.current == null) return;
      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.2) return;
      const next = Math.max(-revealWidth, Math.min(0, dx));
      setOffset(next);
    },
    [revealWidth]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!active.current) return;
      active.current = false;
      setDragging(false);
      startX.current = null;
      startY.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        /* */
      }
      setOffset((cur) => {
        const shouldOpen = cur < -revealWidth * 0.35;
        if (shouldOpen) logGesture("swipe_reveal_open");
        else if (cur < -6) logGesture("swipe_reveal_close");
        return shouldOpen ? -revealWidth : 0;
      });
    },
    [logGesture, revealWidth]
  );

  const onPointerCancel = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    setDragging(false);
    setOffset((cur) => (cur < -revealWidth * 0.35 ? -revealWidth : 0));
  }, [revealWidth]);

  return (
    <div className={cn("relative overflow-hidden rounded-mca-block", className)}>
      <div
        className="absolute inset-y-0 right-0 z-0 flex items-stretch border-l border-mca-border/60 bg-mca-chrome/80"
        style={{ width: revealWidth }}
      >
        {actions}
      </div>
      <div
        className="relative z-[1] touch-pan-y"
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 200ms ease-mca-standard",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {children}
      </div>
    </div>
  );
}
