import { ARTWORK_BINDER } from "@/lib/ui/artwork-tokens";
import type { ReactNode } from "react";

/** Decorative rings behind a binder page title (list or detail). */
export function BinderTitleWithRings({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative public SVG */}
      <img
        src={ARTWORK_BINDER.rings}
        alt=""
        className="pointer-events-none absolute -left-1 -top-7 h-11 w-[7.5rem] max-w-[40vw] select-none opacity-[0.38] dark:opacity-[0.32]"
        width={120}
        height={48}
        aria-hidden
      />
      <div className="relative">{children}</div>
    </div>
  );
}
