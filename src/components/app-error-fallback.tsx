"use client";

import Link from "next/link";

type Props = {
  title?: string;
  message?: string;
  reset?: () => void;
};

export function AppErrorFallback({
  title = "Something went wrong",
  message = "An unexpected error occurred. You can try again or return home.",
  reset,
}: Props) {
  const chunkError =
    typeof message === "string" &&
    /(chunk|loading css chunk|loading chunk|cannot find module)/i.test(message);

  return (
    <div className="mx-auto max-w-lg rounded-mca-card border border-mca-error-border/40 bg-mca-error-surface/20 p-mca-xl text-center shadow-mca-card transition-[box-shadow,opacity] duration-200 ease-mca-standard">
      <h1 className="text-lg font-semibold text-mca-error-text-strong">{title}</h1>
      <p className="mt-mca-sm text-sm text-mca-error-text/80">{message}</p>
      <div className="mt-mca-lg flex flex-wrap items-center justify-center gap-mca-compact">
        {reset ? (
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-mca-control bg-mca-accent-strong/90 px-mca-base py-mca-sm text-sm font-semibold text-mca-on-accent transition-all duration-200 ease-mca-standard hover:bg-mca-accent/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.98]"
          >
            Try again
          </button>
        ) : null}
        {chunkError ? (
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.location.reload();
            }}
            className="rounded-mca-control border border-mca-field-border bg-mca-surface-elevated/60 px-mca-base py-mca-sm text-sm font-medium text-mca-ink-soft transition-all duration-200 ease-mca-standard hover:bg-mca-chrome focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60"
          >
            Reload app
          </button>
        ) : null}
        <Link
          href="/feed"
          className="rounded-mca-control border border-mca-field-border bg-mca-surface-elevated/60 px-mca-base py-mca-sm text-sm font-medium text-mca-ink-soft transition-all duration-200 ease-mca-standard hover:bg-mca-chrome focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60"
        >
          Feed
        </Link>
        <Link
          href="/"
          className="text-sm font-medium text-mca-accent/90 underline-offset-2 transition-colors duration-200 ease-mca-standard hover:underline"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
