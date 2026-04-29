import { cn } from "@/lib/ui/cn";
import type { InputHTMLAttributes } from "react";

/** Default text-field classes aligned with `.mca-input` in globals.css. */
export const mcaInputClassName =
  "mca-input border-mca-border-subtle bg-mca-surface-elevated text-sm text-mca-ink-strong placeholder:text-mca-ink-subtle";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/**
 * Token-backed text input. Merge `className` for variants (e.g. text-white on dark wells).
 */
export function Input({ className, ...rest }: InputProps) {
  return <input className={cn(mcaInputClassName, className)} {...rest} />;
}
