"use client";

import { useEffect, useState } from "react";

/** Keeps modal mounted long enough to run closing opacity/scale transition (matches ModalBase). */
export function useModalMount(isOpen: boolean, exitDurationMs = 200) {
  const [mounted, setMounted] = useState(isOpen);
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const id = requestAnimationFrame(() => setAnimIn(true));
      return () => cancelAnimationFrame(id);
    }
    setAnimIn(false);
    const t = window.setTimeout(() => setMounted(false), exitDurationMs);
    return () => window.clearTimeout(t);
  }, [isOpen, exitDurationMs]);

  return { mounted, animIn };
}

/** Matches `--mca-ease-standard` / Tailwind `ease-mca-standard` (global modal + overlays). */
export const MODAL_MOTION_EASE = "ease-mca-standard";

export function modalBackdropClasses(animIn: boolean): string {
  return `absolute inset-0 bg-black/65 backdrop-blur-[2px] transition-opacity duration-200 ${MODAL_MOTION_EASE} ${
    animIn ? "opacity-100" : "opacity-0"
  }`;
}

export function modalPanelClasses(animIn: boolean, extra = ""): string {
  return `relative z-10 transition-all duration-200 ${MODAL_MOTION_EASE} ${
    animIn ? "scale-100 opacity-100" : "scale-[0.97] opacity-0"
  } ${extra}`.trim();
}
