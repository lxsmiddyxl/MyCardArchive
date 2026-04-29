"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  className?: string;
  durationMs?: number;
};

/** Counts from the previous displayed value to `value` (presentation only). */
export function AnimatedNumber({ value, className = "", durationMs = 550 }: Props) {
  const [display, setDisplay] = useState(0);
  const lastTargetRef = useRef(0);

  useEffect(() => {
    const from = lastTargetRef.current;
    if (from === value) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    let raf: number;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      const next = Math.round(from + (value - from) * eased);
      setDisplay(next);
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        lastTargetRef.current = value;
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return <span className={className}>{display}</span>;
}
