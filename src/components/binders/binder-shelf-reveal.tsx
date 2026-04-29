"use client";

import { useRevealOnScroll } from "@/lib/ui/use-reveal-on-scroll";
import { cn } from "@/lib/ui/cn";
import type { ReactNode } from "react";

/** Stagger-free reveal for the binder shelf grid (IntersectionObserver + token easing). */
export function BinderShelfReveal({ children }: { children: ReactNode }) {
  const { ref, revealed } = useRevealOnScroll();

  return (
    <div
      ref={ref}
      className={cn(
        "will-change-transform transition-[opacity,transform] duration-200 ease-mca-standard",
        "motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none",
        revealed ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
      )}
    >
      {children}
    </div>
  );
}
