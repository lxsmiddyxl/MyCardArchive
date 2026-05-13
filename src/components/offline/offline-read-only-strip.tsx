"use client";

import { Panel } from "@/mca-ui/panel";
import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function getOnlineSnapshot(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true;
}

/** Lightweight offline banner for read-heavy surfaces (Phase 79). */
export function OfflineReadOnlyStrip({ surface }: { surface: string }) {
  const online = useSyncExternalStore(subscribe, getOnlineSnapshot, getServerSnapshot);
  if (online) return null;
  return (
    <Panel
      className="mb-mca-md border border-mca-warning-surface-border/50 bg-mca-warning-surface/25 p-mca-sm"
      role="status"
    >
      <p className="text-sm font-medium text-mca-ink-strong">Offline — {surface} lists are read-only</p>
      <p className="mt-mca-trace text-mca-caption text-mca-ink-muted">
        Reconnect to refresh Pokémon TCG data. Cached pages may still scroll from your last visit.
      </p>
    </Panel>
  );
}
