import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[min(24rem,calc(100vh-8rem))] flex-col items-center justify-center px-mca-base py-mca-stage text-center">
      <h1 className="text-2xl font-semibold text-mca-ink-strong">Page not found</h1>
      <p className="mt-mca-compact max-w-md text-sm text-mca-ink-muted">
        That page does not exist or you do not have access.
      </p>
      <Link
        href="/feed"
        className="mt-mca-xl rounded-mca-control border border-mca-border-subtle bg-mca-surface-elevated/80 px-mca-base py-mca-tight text-sm font-medium text-mca-ink-soft transition-all duration-200 ease-mca-standard hover:bg-mca-chrome/60 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97]"
      >
        Back to feed
      </Link>
    </div>
  );
}
