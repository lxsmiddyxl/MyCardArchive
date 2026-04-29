export default function RootLoading() {
  return (
    <div className="flex min-h-[min(16rem,calc(100vh-6rem))] items-center justify-center">
      <div className="flex flex-col items-center gap-mca-base">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-mca-border-subtle border-t-mca-focus/80"
          aria-hidden
        />
        <p className="text-sm text-mca-ink-subtle">Loading…</p>
      </div>
    </div>
  );
}
