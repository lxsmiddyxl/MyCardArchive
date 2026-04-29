import { SyncCenterClient } from "@/app/mobile/sync/sync-center-client";

export default function MobileSyncPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-mca-base px-mca-base py-mca-xl pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-mca-xl">
      <div>
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">Mobile</p>
        <h1 className="text-mca-display text-mca-ink-strong">Sync Center</h1>
        <p className="mt-mca-sm text-mca-body text-mca-ink-muted">
          Offline-first queues for binder, deck, marketplace, trades, and community. Inspect pending work, conflicts,
          and retry history.
        </p>
      </div>
      <SyncCenterClient />
    </div>
  );
}
