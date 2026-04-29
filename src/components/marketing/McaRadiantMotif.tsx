import { cn } from "@/lib/ui/cn";
import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement>;

/** Decorative radial wash; pairs with `motifs.radiant` from artwork preload. */
export function McaRadiantMotif({ className, ...rest }: Props) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden
      {...rest}
    >
      <div className="absolute -top-[20%] left-1/2 h-[min(85vh,720px)] w-[min(140vw,960px)] max-w-none -translate-x-1/2 rounded-full bg-mca-accent-strong/18 blur-3xl dark:bg-mca-accent-strong/14" />
    </div>
  );
}
