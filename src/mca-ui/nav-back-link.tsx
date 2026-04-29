import { cn } from "@/lib/ui/cn";
import Link from "next/link";
import type { ComponentProps } from "react";

export type NavBackLinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  className?: string;
};

/**
 * Standard “← …” back navigation — tokens + focus ring aligned with {@link Button} secondary affordance.
 */
export function NavBackLink({ className, children, ...rest }: NavBackLinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex text-sm font-medium text-mca-ink-muted transition-colors duration-200 ease-mca-standard hover:text-mca-accent-strong/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 focus-visible:ring-offset-2 focus-visible:ring-offset-mca-surface",
        className
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}
