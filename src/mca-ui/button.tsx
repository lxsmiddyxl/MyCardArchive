import { cn } from "@/lib/ui/cn";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  /** Alias of `tertiary` — use in product copy that says “subtle”. */
  | "subtle"
  | "destructive";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-mca-accent-border/50 bg-mca-accent-strong/90 text-mca-on-accent shadow-mca-panel shadow-black/20 hover:bg-mca-accent/95 hover:shadow-mca-panel focus-visible:ring-mca-focus/60 disabled:border-mca-border-subtle disabled:bg-mca-chrome disabled:text-mca-ink-subtle",
  secondary:
    "border border-mca-field-border bg-mca-chrome text-mca-ink-strong hover:bg-mca-border-subtle hover:border-mca-border-interactive focus-visible:ring-mca-focus/60 disabled:opacity-50",
  tertiary:
    "border border-transparent bg-transparent text-mca-ink-body hover:bg-mca-chrome/80 hover:text-mca-ink-strong focus-visible:ring-mca-focus/60 disabled:opacity-50",
  subtle:
    "border border-transparent bg-transparent text-mca-ink-body hover:bg-mca-chrome/80 hover:text-mca-ink-strong focus-visible:ring-mca-focus/60 disabled:opacity-50",
  destructive:
    "border border-mca-error-border-strong/80 bg-mca-error-surface/40 text-mca-error-text-strong hover:bg-mca-error-border/50 focus-visible:ring-mca-error-focus/50 disabled:opacity-50",
};

const baseClasses =
  "inline-flex touch-manipulation select-none items-center justify-center gap-mca-sm rounded-mca-control px-mca-compact py-mca-sm text-sm font-semibold transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-200 ease-mca-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-mca-surface active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(baseClasses, variantClasses[variant], className)}
      {...rest}
    />
  );
});
Button.displayName = "Button";
