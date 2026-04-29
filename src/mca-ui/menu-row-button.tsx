import { cn } from "@/lib/ui/cn";
import type { ButtonHTMLAttributes } from "react";

const base =
  "mca-nav-focus-ring w-full rounded-mca-control px-mca-compact py-mca-sm text-left text-sm font-medium text-mca-ink-body outline-none transition-colors duration-200 ease-mca-standard focus-visible:ring-2 focus-visible:ring-mca-focus/50 focus-visible:ring-offset-2 focus-visible:ring-offset-mca-surface disabled:opacity-50";

export type MenuRowButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "danger";
};

/**
 * Full-width menu row action (e.g. account dropdown sign out).
 */
export function MenuRowButton({
  variant = "default",
  className,
  type = "button",
  ...rest
}: MenuRowButtonProps) {
  return (
    <button
      type={type}
      role="menuitem"
      className={cn(
        base,
        variant === "default" && "hover:bg-mca-surface-elevated",
        variant === "danger" && "hover:bg-mca-surface-elevated hover:text-mca-error-text",
        className
      )}
      {...rest}
    />
  );
}
