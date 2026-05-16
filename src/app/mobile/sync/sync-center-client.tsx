"use client";

import { Button } from "@/mca-ui/button";
import { Panel } from "@/mca-ui/panel";
import {
  clearOfflineActions,
  listOfflineActions,
  listSyncConflicts,
  listSyncRetryHistory,
  resolveSyncConflict,
} from "@/lib/mobile/offline-action-queue";
import { GESTURE_AFFORDANCES, type GestureAffordanceId } from "@/lib/mobile/gesture-affordances";
import { clearListLkg, LIST_LKG_KEYS, readListLkg } from "@/lib/offline/list-lkg-cache";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { useCallback, useEffect, useState } from "react";

export function SyncCenterClient() {
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    mcaLog.event("mobile.sync_center.open", {}, { componentName: "SyncCenterClient", surfaceName: "mobile" });
  }, []);

  useEffect(() => {
    const onVis = () => refresh();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refresh]);

  const queue = listOfflineActions();
  const retries = listSyncRetryHistory();
  const conflicts = listSyncConflicts();
  const feedLkg = readListLkg(LIST_LKG_KEYS.feed);
  const bindersLkg = readListLkg(LIST_LKG_KEYS.binders);

  const onGesture = (id: GestureAffordanceId) => {
    mcaLog.event("mobile.v4.gesture", { gestureId: id }, { componentName: "SyncCenterClient", surfaceName: "mobile" });
    if (id === "swipe_refresh") refresh();
  };

  const onClearLkg = () => {
    clearListLkg(LIST_LKG_KEYS.feed);
    clearListLkg(LIST_LKG_KEYS.binders);
    clearListLkg(LIST_LKG_KEYS.decks);
    clearListLkg(LIST_LKG_KEYS.marketOffers);
    refresh();
  };

  const onResolve = (id: string) => {
    resolveSyncConflict(id);
    mcaLog.event(
      "mobile.sync_center.resolve",
      { conflictId: id, outcome: "dismissed" },
      { componentName: "SyncCenterClient", surfaceName: "mobile" }
    );
    refresh();
  };

  const onClearQueue = () => {
    clearOfflineActions();
    refresh();
  };

  return (
    <div className="touch-manipulation space-y-mca-lg">
      <div className="flex justify-end">
        <Button type="button" variant="secondary" onClick={refresh}>
          Refresh
        </Button>
      </div>
      <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Offline list cache
        </p>
        <p className="mt-mca-xs text-mca-caption text-mca-hint">
          Last-known-good snapshots for feed and binders when you are offline.
        </p>
        <ul className="mt-mca-md space-y-mca-xs text-mca-caption text-mca-ink-body">
          <li>Feed · {feedLkg ? `${feedLkg.items.length} items` : "none"}</li>
          <li>Binders · {bindersLkg ? `${bindersLkg.items.length} items` : "none"}</li>
        </ul>
        <div className="mt-mca-md flex flex-wrap gap-mca-sm">
          {(Object.keys(GESTURE_AFFORDANCES) as GestureAffordanceId[]).map((id) => (
            <Button key={id} type="button" variant="secondary" onClick={() => onGesture(id)}>
              {GESTURE_AFFORDANCES[id].label}
            </Button>
          ))}
          <Button type="button" variant="secondary" onClick={onClearLkg}>
            Clear cached lists
          </Button>
        </div>
      </Panel>

      <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Queued actions
        </p>
        <p className="mt-mca-xs text-mca-caption text-mca-hint">
          Binder moves, deck edits, marketplace flags, trades, and community drafts retry when you are online.
        </p>
        {queue.length === 0 ? (
          <p className="mt-mca-md text-mca-body text-mca-ink-muted">Queue is empty.</p>
        ) : (
          <ul className="mt-mca-md space-y-mca-sm font-mono text-mca-caption text-mca-ink-body">
            {queue.map((a) => (
              <li key={a.id} className="rounded-mca-control border border-mca-border/70 bg-mca-surface/50 px-mca-sm py-mca-xs">
                {a.kind} · {a.id.slice(0, 10)}…
              </li>
            ))}
          </ul>
        )}
        {queue.length > 0 ? (
          <div className="mt-mca-md flex justify-end">
            <Button type="button" variant="destructive" onClick={onClearQueue}>
              Clear queue
            </Button>
          </div>
        ) : null}
      </Panel>

      <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Conflict resolution
        </p>
        <p className="mt-mca-xs text-mca-caption text-mca-hint">
          When the server rejects a change (e.g. version mismatch), a conflict can appear here for review.
        </p>
        {conflicts.length === 0 ? (
          <p className="mt-mca-md text-mca-body text-mca-ink-muted">No active conflicts.</p>
        ) : (
          <ul className="mt-mca-md space-y-mca-sm">
            {conflicts.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-start justify-between gap-mca-sm rounded-mca-control border border-mca-border/70 bg-mca-surface/50 p-mca-sm"
              >
                <div>
                  <p className="text-sm font-medium text-mca-ink-strong">{c.surface}</p>
                  <p className="text-mca-caption text-mca-ink-muted">{c.summary}</p>
                </div>
                <Button type="button" variant="secondary" onClick={() => onResolve(c.id)}>
                  Dismiss
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Retry history
        </p>
        {retries.length === 0 ? (
          <p className="mt-mca-md text-mca-body text-mca-ink-muted">No completed sync attempts yet.</p>
        ) : (
          <ul className="mt-mca-md max-h-64 space-y-mca-xs overflow-auto font-mono text-mca-caption text-mca-ink-body">
            {retries.map((r) => (
              <li key={`${r.id}-${r.at}`}>
                {new Date(r.at).toLocaleString()} · {r.kind} · {r.outcome}
                {r.detail ? ` · ${r.detail}` : ""}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
