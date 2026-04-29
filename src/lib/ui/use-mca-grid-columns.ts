"use client";

import { useEffect, useState } from "react";

/** Responsive column count aligned with Tailwind `sm` / `xl` breakpoints. */
export function useMcaGridColumns(): 1 | 2 | 3 {
  const [cols, setCols] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    const sync = () => {
      const w = window.innerWidth;
      if (w >= 1280) setCols(3);
      else if (w >= 640) setCols(2);
      else setCols(1);
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  return cols;
}
