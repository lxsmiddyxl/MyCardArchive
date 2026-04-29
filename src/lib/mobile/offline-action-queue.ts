/**
 * Offline-first mutation queue (Phase 64). Persists to localStorage; flush on `online` or explicit calls.
 */

import { mcaLog } from "@/lib/logging/mca-log-client";

const STORAGE_KEY = "mca:offline-action-queue:v1";
const RETRY_KEY = "mca:sync-retry-history:v1";
const CONFLICT_KEY = "mca:sync-conflicts:v1";
const MAX_ITEMS = 80;
const MAX_RETRY = 64;
const MAX_CONFLICTS = 24;

export type OfflineQueuedAction =
  | {
      id: string;
      kind: "trade_message";
      tradeId: string;
      body: string;
      createdAt: number;
    }
  | {
      id: string;
      kind: "card_market_flags";
      cardId: string;
      patch: { for_trade?: boolean; looking_for?: boolean };
      createdAt: number;
    }
  | {
      id: string;
      kind: "binder_slot_move";
      binderId: string;
      from: { page: number; slot: number };
      to: { page: number; slot: number };
      createdAt: number;
    }
  | {
      id: string;
      kind: "deck_zone_change";
      deckId: string;
      cardId: string;
      action: "add" | "remove" | "move";
      zone?: "main" | "sideboard" | "commander";
      fromZone?: "main" | "sideboard" | "commander";
      toZone?: "main" | "sideboard" | "commander";
      createdAt: number;
    }
  | {
      id: string;
      kind: "community_post_draft";
      body: string;
      createdAt: number;
    };

export type OfflineQueuedActionInput =
  | Omit<Extract<OfflineQueuedAction, { kind: "trade_message" }>, "id" | "createdAt">
  | Omit<Extract<OfflineQueuedAction, { kind: "card_market_flags" }>, "id" | "createdAt">
  | Omit<Extract<OfflineQueuedAction, { kind: "binder_slot_move" }>, "id" | "createdAt">
  | Omit<Extract<OfflineQueuedAction, { kind: "deck_zone_change" }>, "id" | "createdAt">
  | Omit<Extract<OfflineQueuedAction, { kind: "community_post_draft" }>, "id" | "createdAt">;

export type SyncRetryEntry = {
  id: string;
  kind: string;
  outcome: "synced" | "failed";
  at: number;
  detail?: string;
};

export type SyncConflictRow = {
  id: string;
  surface: string;
  summary: string;
  createdAt: number;
};

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readAll(): OfflineQueuedAction[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as OfflineQueuedAction[];
  } catch {
    return [];
  }
}

function writeAll(items: OfflineQueuedAction[]): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-MAX_ITEMS)));
  } catch {
    /* quota */
  }
}

export function enqueueOfflineAction(action: OfflineQueuedActionInput): string {
  const id = randomId();
  const row = { ...action, id, createdAt: Date.now() } as OfflineQueuedAction;
  const next = [...readAll(), row];
  writeAll(next);
  mcaLog.event(
    "mobile.offline.queue",
    { kind: row.kind, op: "enqueue", id: row.id },
    { componentName: "offline-action-queue", surfaceName: "mobile" }
  );
  return id;
}

export function listOfflineActions(): OfflineQueuedAction[] {
  return readAll();
}

export function removeOfflineAction(id: string): void {
  writeAll(readAll().filter((x) => x.id !== id));
}

function readRetryLog(): SyncRetryEntry[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(RETRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SyncRetryEntry[]) : [];
  } catch {
    return [];
  }
}

function writeRetryLog(entries: SyncRetryEntry[]): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(RETRY_KEY, JSON.stringify(entries.slice(-MAX_RETRY)));
  } catch {
    /* quota */
  }
}

/** Remove a queued action and append a retry-history row (Phase 79 Sync Center). */
export function finalizeOfflineAction(id: string, outcome: "synced" | "failed", detail?: string): void {
  const items = readAll();
  const found = items.find((x) => x.id === id);
  if (!found) return;
  writeAll(items.filter((x) => x.id !== id));
  const next = [
    ...readRetryLog(),
    { id: found.id, kind: found.kind, outcome, at: Date.now(), detail },
  ];
  writeRetryLog(next);
}

export function listSyncRetryHistory(): SyncRetryEntry[] {
  return readRetryLog().slice().reverse();
}

function readConflicts(): SyncConflictRow[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(CONFLICT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SyncConflictRow[]) : [];
  } catch {
    return [];
  }
}

function writeConflicts(rows: SyncConflictRow[]): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(CONFLICT_KEY, JSON.stringify(rows.slice(-MAX_CONFLICTS)));
  } catch {
    /* quota */
  }
}

/** Optional: register a lightweight conflict for the Sync Center (e.g. future 409 handling). */
export function registerSyncConflict(row: Omit<SyncConflictRow, "createdAt"> & { createdAt?: number }): string {
  const id = row.id || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const next = [
    ...readConflicts(),
    {
      id,
      surface: row.surface,
      summary: row.summary,
      createdAt: row.createdAt ?? Date.now(),
    },
  ];
  writeConflicts(next);
  return id;
}

export function listSyncConflicts(): SyncConflictRow[] {
  return readConflicts().slice().reverse();
}

export function resolveSyncConflict(id: string): void {
  writeConflicts(readConflicts().filter((c) => c.id !== id));
}

export function clearOfflineActions(): void {
  writeAll([]);
}

export function isLikelyOfflineError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /network|fetch|failed|offline/i.test(msg);
}
