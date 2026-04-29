import { cn } from "@/lib/ui/cn";
import type { HTMLAttributes } from "react";

export type PanelProps = HTMLAttributes<HTMLDivElement> & {
  /** Slightly stronger border for elevated surfaces */
  elevated?: boolean;
};

export function Panel({ className, elevated, ...rest }: PanelProps) {
  return (
    <div
      className={cn(
        "mca-panel p-mca-md",
        elevated && "shadow-mca-card",
        className
      )}
      {...rest}
    />
  );
}
