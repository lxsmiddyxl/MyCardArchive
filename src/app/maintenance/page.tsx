import { Panel } from "@/mca-ui/panel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Maintenance",
  description: "MyCardArchive is temporarily unavailable.",
  robots: { index: false, follow: false },
};

/**
 * Shown when `MAINTENANCE_MODE` is enabled in middleware (Phase 47).
 */
export default function MaintenancePage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center py-mca-2xl">
      <Panel
        elevated
        className="max-w-md border-mca-border bg-mca-surface-elevated/80 p-mca-lg text-center shadow-mca-card"
      >
        <h1 className="text-mca-display text-mca-ink-strong">We&apos;ll be right back</h1>
        <p className="mt-mca-md text-mca-body text-mca-ink-muted">
          MyCardArchive is in maintenance mode. Pokémon collection tools (binders, decks, trades, and
          scans) are paused briefly while we ship improvements. Please try again in a few minutes.
        </p>
        <p className="mt-mca-sm text-mca-caption text-mca-hint">
          Your cards and binders in the database are safe—only the web app is temporarily unavailable.
        </p>
      </Panel>
    </div>
  );
}
