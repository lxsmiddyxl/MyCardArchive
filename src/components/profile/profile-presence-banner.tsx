"use client";

import { useAppWidePresence } from "@/components/realtime/app-wide-presence";

/**
 * App-wide online presence via {@link AuthenticatedPresenceShell} (unified `online-users` topic).
 */
export function ProfilePresenceBanner() {
  const { unavailable, onlineCount } = useAppWidePresence();

  if (unavailable) {
    return null;
  }

  if (onlineCount === null) {
    return (
      <p className="mt-mca-sm text-mca-caption text-mca-hint" aria-live="polite">
        Connecting…
      </p>
    );
  }

  return (
    <p className="mt-mca-sm text-mca-caption text-mca-ink-subtle" aria-live="polite">
      <span
        className="inline-flex flex-wrap items-center gap-mca-xs"
        title="This user is currently online"
      >
        <span
          className="inline-block size-2 shrink-0 rounded-full bg-mca-success-bold/90 shadow-[0_0_8px_rgba(52,211,153,0.45)]"
          aria-hidden
        />
        <span>
          {onlineCount} user{onlineCount === 1 ? "" : "s"} online
          <span className="text-mca-success/95"> · Online now</span>
        </span>
      </span>
    </p>
  );
}
