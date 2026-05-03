import { cn } from "@/lib/ui/cn";
import type { InputHTMLAttributes } from "react";

/** Default text-field classes aligned with `.mca-input` in globals.css (also use on textarea/select via `mca-input`). */
export const mcaInputClassName =
  "mca-input border-mca-border-subtle bg-mca-surface-elevated text-sm text-mca-ink-strong placeholder:text-mca-ink-subtle";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/**
 * Token-backed text input. Prefer over raw `<input>` so ink/placeholder stay readable inside tinted panels.
 */
export function Input({ className, ...rest }: InputProps) {
  return <input className={cn(mcaInputClassName, className)} {...rest} />;
}
