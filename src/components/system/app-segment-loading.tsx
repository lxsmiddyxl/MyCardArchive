/**
 * Shared route `loading.tsx` shell: stable min-height to reduce layout shift while segments stream.
 */
export function AppSegmentLoading({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-[min(18rem,calc(100dvh-8rem))] flex-col gap-mca-lg py-mca-xl"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
    >
      <div className="space-y-mca-sm">
        <div className="h-8 w-48 max-w-[70%] animate-pulse rounded-mca-block bg-mca-chrome/80" />
        <div className="h-4 w-72 max-w-[85%] animate-pulse rounded-mca-block bg-mca-chrome/60" />
      </div>
      <div className="grid gap-mca-base sm:grid-cols-2">
        <div className="h-36 animate-pulse rounded-mca-sheet border border-mca-border/60 bg-mca-surface-elevated/35" />
        <div className="h-36 animate-pulse rounded-mca-sheet border border-mca-border/60 bg-mca-surface-elevated/35" />
        <div className="h-36 animate-pulse rounded-mca-sheet border border-mca-border/60 bg-mca-surface-elevated/35 sm:col-span-2" />
      </div>
    </div>
  );
}
