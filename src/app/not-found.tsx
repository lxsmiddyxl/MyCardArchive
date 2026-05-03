import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-[min(24rem,calc(100vh-8rem))] flex-col items-center justify-center px-mca-base py-mca-stage text-center">
      <h1 className="text-2xl font-semibold text-mca-ink-strong">Page not found</h1>
      <p className="mt-mca-compact max-w-md text-sm text-mca-ink-muted">
        That page does not exist or you do not have access.
      </p>
      <div className="mt-mca-xl flex flex-col items-center gap-mca-compact sm:flex-row">
        <Link
          href="/feed"
          className="inline-flex min-h-[2.75rem] items-center justify-center rounded-mca-control bg-mca-accent-strong/90 px-mca-base py-mca-sm text-sm font-semibold text-mca-on-accent transition-all duration-200 ease-mca-standard hover:bg-mca-accent/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.98]"
        >
          Back to feed
        </Link>
        <Link
          href="/support"
          className="inline-flex min-h-[2.75rem] items-center justify-center rounded-mca-control border border-mca-field-border bg-mca-surface-elevated/60 px-mca-base py-mca-sm text-sm font-medium text-mca-ink-soft transition-all duration-200 ease-mca-standard hover:bg-mca-chrome/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60"
        >
          Support
        </Link>
        <Link
          href="/legal/terms"
          className="text-sm font-medium text-mca-accent/90 underline-offset-2 transition-colors duration-200 ease-mca-standard hover:underline"
        >
          Terms
        </Link>
      </div>
    </div>
  );
}
