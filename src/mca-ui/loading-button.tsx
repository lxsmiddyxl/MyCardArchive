"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`size-4 shrink-0 animate-spin text-current transition-opacity duration-200 ease-mca-standard ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  isLoading?: boolean;
  children: ReactNode;
};

/**
 * Preserves button width while loading via invisible measurement text.
 */
export function LoadingButton({
  isLoading = false,
  disabled,
  children,
  className = "",
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`relative ${className}`}
      {...rest}
    >
      <span className="invisible inline-flex min-h-[1.25rem] items-center justify-center gap-mca-sm whitespace-nowrap px-mca-trace">
        {children}
      </span>
      <span className="absolute inset-0 flex min-h-[1.25rem] items-center justify-center gap-mca-sm whitespace-nowrap px-mca-trace">
        {isLoading ? (
          <>
            <LoadingSpinner className="mca-spinner-fade" />
            <span className="sr-only">Loading</span>
          </>
        ) : (
          children
        )}
      </span>
    </button>
  );
}
