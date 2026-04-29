import { cn } from "@/lib/ui/cn";
import type { ButtonHTMLAttributes } from "react";

export type NavToolbarButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Header toolbar trigger — uses global `mca-header-toolbar-control` styles.
 */
export function NavToolbarButton({ className, type = "button", ...rest }: NavToolbarButtonProps) {
  return (
    <button
      type={type}
      className={cn("mca-header-toolbar-control", className)}
      {...rest}
    />
  );
}
