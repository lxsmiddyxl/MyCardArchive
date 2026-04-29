import { cn } from "@/lib/ui/cn";
import type { HTMLAttributes } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Adds stronger hover/shadow lift (analytics-style metric cards). */
  elevated?: boolean;
};

/**
 * Card surface — rounded shell with border; use for stats tiles, compact summaries.
 */
export function Card({ className, elevated, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-mca-block border border-mca-border bg-mca-surface-elevated/80 shadow-mca-panel transition-all duration-200 ease-mca-standard dark:border-mca-border-subtle",
        elevated && "hover:shadow-mca-card",
        className
      )}
      {...rest}
    />
  );
}
