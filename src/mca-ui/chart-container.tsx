import { cn } from "@/lib/ui/cn";
import type { HTMLAttributes } from "react";

export type ChartContainerProps = HTMLAttributes<HTMLDivElement>;

/**
 * Framed region for charts (border, padding, subtle shadow).
 */
export function ChartContainer({ className, ...rest }: ChartContainerProps) {
  return (
    <div
      className={cn(
        "rounded-mca-block border border-mca-border-subtle bg-mca-surface-elevated/60 p-mca-md shadow-mca-panel dark:border-mca-border-subtle",
        className
      )}
      {...rest}
    />
  );
}
