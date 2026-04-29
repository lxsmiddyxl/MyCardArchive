import { cn } from "@/lib/ui/cn";
import type { HTMLAttributes, ReactNode } from "react";

export type MetricGridProps = HTMLAttributes<HTMLUListElement>;

/**
 * Responsive grid for dashboard metric cards (1 col mobile, 3 col sm+).
 */
export function MetricGrid({ className, ...rest }: MetricGridProps) {
  return (
    <ul
      className={cn("grid grid-cols-1 gap-mca-md sm:grid-cols-3", className)}
      {...rest}
    />
  );
}

export type MetricBlockProps = Omit<HTMLAttributes<HTMLLIElement>, "title"> & {
  label: ReactNode;
  /** Extra `mca-section-reveal-delay-*` or similar */
  revealClassName?: string;
};

/**
 * Single metric tile (label + custom value row as children).
 */
export function MetricBlock({
  label,
  children,
  className,
  revealClassName,
  ...rest
}: MetricBlockProps) {
  return (
    <li
      className={cn(
        "mca-section-reveal rounded-mca-block border border-mca-border bg-mca-surface-elevated/80 px-mca-comfortable py-mca-md shadow-mca-panel transition-all duration-200 ease-mca-standard hover:shadow-mca-card dark:border-mca-border-subtle",
        revealClassName,
        className
      )}
      {...rest}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mca-ink-subtle">
        {label}
      </p>
      {children}
    </li>
  );
}
