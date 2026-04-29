import { cn } from "@/lib/ui/cn";
import type { HTMLAttributes } from "react";

/** Floating panel for tier tooltips — matches MCA panel chrome (no Radix in app deps). */
export function TooltipSurface({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "pointer-events-none max-w-[min(16rem,calc(100vw-2rem))] rounded-mca-block border border-mca-border bg-mca-surface-elevated/95 p-mca-sm text-left shadow-mca-panel backdrop-blur-sm dark:border-mca-border-subtle",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
