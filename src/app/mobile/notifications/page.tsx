import { MobileNotificationsClient } from "@/components/mobile/mobile-notifications-client";

export default function MobileNotificationsPage() {
  return (
    <div className="mx-auto max-w-lg space-y-mca-base px-mca-base py-mca-xl pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-mca-xl">
      <div>
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">Mobile</p>
        <h1 className="text-mca-display text-mca-ink-strong">Notifications</h1>
        <p className="mt-mca-sm text-mca-body text-mca-ink-muted">
          Push registration and service-worker message channel (Phase 84). Feed and marketplace use cached shells when offline.
        </p>
      </div>
      <MobileNotificationsClient />
    </div>
  );
}
