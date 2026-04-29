"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reveal-on-scroll using IntersectionObserver. Uses transform + opacity (GPU-friendly).
 * Respects reduced motion via caller (e.g. skip translate when prefers-reduced-motion).
 */
export function useRevealOnScroll<T extends HTMLElement = HTMLDivElement>(
  options?: IntersectionObserverInit
) {
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setRevealed(true);
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06, ...options }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [options]);

  return { ref, revealed };
}
