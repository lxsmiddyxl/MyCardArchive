import { cn } from "@/lib/ui/cn";
import type { HTMLAttributes, ReactNode } from "react";

export type SectionShellProps = HTMLAttributes<HTMLElement> & {
  /** Optional heading; links section via aria-labelledby when `sectionId` is set */
  title?: ReactNode;
  /** Sets `id` on `<section>` and `${id}-heading` on the title */
  sectionId?: string;
};

/**
 * Standard section wrapper with optional reveal + heading pattern used across app routes.
 */
export function SectionShell({
  title,
  sectionId,
  className,
  children,
  ...rest
}: SectionShellProps) {
  return (
    <section
      id={sectionId}
      className={cn("mca-section-reveal space-y-mca-base", className)}
      aria-labelledby={sectionId && title ? `${sectionId}-heading` : undefined}
      {...rest}
    >
      {title != null && sectionId ? (
        <h2
          id={`${sectionId}-heading`}
          className="text-sm font-semibold uppercase tracking-wide text-mca-hint dark:text-mca-ink-body"
        >
          {title}
        </h2>
      ) : title != null ? (
        <h2 className="text-sm font-semibold uppercase tracking-wide text-mca-hint dark:text-mca-ink-body">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}
