import { cn } from "@/lib/ui/cn";
import type { ReactNode } from "react";

export type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
};

export function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
  disabled,
}: FieldProps) {
  const err = Boolean(error);
  return (
    <div className={cn("space-y-mca-micro", className)}>
      <label
        htmlFor={id}
        className={cn(
          "block text-xs font-semibold uppercase tracking-wide text-mca-ink-subtle",
          disabled && "opacity-60"
        )}
      >
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-mca-hint">
          {hint}
        </p>
      ) : null}
      {children}
      {err ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-sm text-mca-error-accent"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
