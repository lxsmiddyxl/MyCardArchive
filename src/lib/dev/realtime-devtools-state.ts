/**
 * Development-only realtime observability (channels, presence, debounces, silent refetches).
 * All record* functions no-op when not in development (zero work; stable empty snapshots).
 */

const IS_DEV = process.env.NODE_ENV === "development";

function devConsoleGroup(label: string, detail: Record<string, unknown> | string): void {
  if (!IS_DEV || typeof console === "undefined") return;
  console.groupCollapsed(`%c[MCA realtime] ${label}`, "color:#94a3b8;font-weight:normal");
  console.log(detail);
  console.groupEnd();
}

export type PostgresChannelRow = {
  key: string;
  subscribers: number;
  eventCount: number;
  lastEventAt: number | null;
  lastEventSummary: string | null;
};

export type PresenceTopicRow = {
  logicalName: string;
  topic: string;
  metaCount: number;
  lastSyncAt: number | null;
  lastEventSummary: string | null;
};

export type DebounceRow = {
  id: string;
  label: string;
  armedAt: number;
  firesAt: number;
  delayMs: number;
};

export type SilentRefetchRow = {
  source: string;
  at: number;
};

/** Mux reconnect attempts (scheduled) or terminal exhaustion. */
export type MuxRetryRow = {
  id: string;
  channelKey: string;
  kind: "retry" | "exhausted";
  attempt?: number;
  delayMs?: number;
  status: string;
  at: number;
};

export type RealtimeDevtoolsSnapshot = {
  postgres: PostgresChannelRow[];
  presence: PresenceTopicRow[];
  muxRetries: MuxRetryRow[];
  debounces: DebounceRow[];
  silentRefetches: SilentRefetchRow[];
};

/** Stable empty snapshot for non-dev, SSR, and useSyncExternalStore server snapshot (same reference). */
const EMPTY_SNAPSHOT: RealtimeDevtoolsSnapshot = {
  postgres: [],
  presence: [],
  muxRetries: [],
  debounces: [],
  silentRefetches: [],
};

/** Use as `getServerSnapshot` for `useSyncExternalStore` — must stay referentially stable. */
export function getRealtimeDevtoolsServerSnapshot(): RealtimeDevtoolsSnapshot {
  return EMPTY_SNAPSHOT;
}

let cachedSnapshot: RealtimeDevtoolsSnapshot | null = null;
/** `version` value that `cachedSnapshot` was built from. */
let snapshotVersion = -1;

const postgres = new Map<
  string,
  { subscribers: number; eventCount: number; lastEventAt: number | null; lastEventSummary: string | null }
>();

const presence = new Map<
  string,
  {
    metaCount: number;
    lastSyncAt: number | null;
    lastEventSummary: string | null;
  }
>();

const debounces = new Map<string, DebounceRow>();

const silentRefetches: SilentRefetchRow[] = [];
const MAX_SILENT = 24;

const muxRetryLog: MuxRetryRow[] = [];
const MAX_MUX_RETRY = 32;
let muxRetrySeq = 0;

let version = 0;
const listeners = new Set<() => void>();

function bump() {
  if (!IS_DEV) return;
  version += 1;
  listeners.forEach((l) => {
    l();
  });
}

export function subscribeRealtimeDevtools(listener: () => void): () => void {
  if (!IS_DEV) return () => {};
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getRealtimeDevtoolsSnapshot(): RealtimeDevtoolsSnapshot {
  if (!IS_DEV) {
    return EMPTY_SNAPSHOT;
  }
  if (cachedSnapshot !== null && snapshotVersion === version) {
    return cachedSnapshot;
  }

  const pg: PostgresChannelRow[] = [];
  postgres.forEach((v, key) => {
    pg.push({
      key,
      subscribers: v.subscribers,
      eventCount: v.eventCount,
      lastEventAt: v.lastEventAt,
      lastEventSummary: v.lastEventSummary,
    });
  });
  pg.sort((a, b) => a.key.localeCompare(b.key));

  const pr: PresenceTopicRow[] = [];
  presence.forEach((v, logicalName) => {
    pr.push({
      logicalName,
      topic: `presence:${logicalName}`,
      metaCount: v.metaCount,
      lastSyncAt: v.lastSyncAt,
      lastEventSummary: v.lastEventSummary,
    });
  });
  pr.sort((a, b) => a.logicalName.localeCompare(b.logicalName));

  const db: DebounceRow[] = Array.from(debounces.values()).sort((a, b) => a.id.localeCompare(b.id));

  cachedSnapshot = {
    postgres: pg,
    presence: pr,
    muxRetries: [...muxRetryLog],
    debounces: db,
    silentRefetches: [...silentRefetches],
  };
  snapshotVersion = version;
  return cachedSnapshot;
}

// --- Postgres multiplex ---

export function devtoolsPostgresSubscriberDelta(channelKey: string, delta: number): void {
  if (!IS_DEV) return;
  let row = postgres.get(channelKey);
  if (!row) {
    if (delta <= 0) return;
    row = { subscribers: 0, eventCount: 0, lastEventAt: null, lastEventSummary: null };
    postgres.set(channelKey, row);
  }
  row.subscribers = Math.max(0, row.subscribers + delta);
  if (row.subscribers === 0) {
    postgres.delete(channelKey);
  }
  bump();
}

export function devtoolsPostgresEvent(
  channelKey: string,
  summary: string
): void {
  if (!IS_DEV) return;
  const row = postgres.get(channelKey);
  if (!row) return;
  row.eventCount += 1;
  row.lastEventAt = Date.now();
  row.lastEventSummary = summary;
  bump();
}

/** Dev-only: multiplexed postgres channel scheduled reconnect after failure. */
export function devtoolsPostgresRetry(
  channelKey: string,
  attempt: number,
  delayMs: number,
  status: string
): void {
  if (!IS_DEV) return;
  const at = Date.now();
  devConsoleGroup(`Mux retry · ${channelKey}`, {
    attempt,
    delayMs,
    status,
    at: new Date(at).toISOString(),
  });
  muxRetrySeq += 1;
  muxRetryLog.unshift({
    id: `mux-${muxRetrySeq}`,
    channelKey,
    kind: "retry",
    attempt,
    delayMs,
    status,
    at,
  });
  if (muxRetryLog.length > MAX_MUX_RETRY) muxRetryLog.length = MAX_MUX_RETRY;
  const row = postgres.get(channelKey);
  if (row) {
    row.lastEventAt = at;
    row.lastEventSummary = `retry ${attempt} in ${delayMs}ms (${status})`;
  }
  bump();
}

/** Dev-only: mux gave up after max retries (channel removed until subscribers change). */
export function devtoolsPostgresRetryExhausted(channelKey: string, status: string): void {
  if (!IS_DEV) return;
  const at = Date.now();
  devConsoleGroup(`Mux retry exhausted · ${channelKey}`, { status, at: new Date(at).toISOString() });
  muxRetrySeq += 1;
  muxRetryLog.unshift({
    id: `mux-${muxRetrySeq}`,
    channelKey,
    kind: "exhausted",
    status,
    at,
  });
  if (muxRetryLog.length > MAX_MUX_RETRY) muxRetryLog.length = MAX_MUX_RETRY;
  const row = postgres.get(channelKey);
  if (row) {
    row.lastEventAt = at;
    row.lastEventSummary = `retry exhausted (${status})`;
  }
  bump();
}

// --- Presence ---

export function devtoolsPresenceTopicOpened(logicalName: string): void {
  if (!IS_DEV) return;
  if (!presence.has(logicalName)) {
    presence.set(logicalName, { metaCount: 0, lastSyncAt: null, lastEventSummary: null });
  }
  bump();
}

export function devtoolsPresenceTopicClosed(logicalName: string): void {
  if (!IS_DEV) return;
  presence.delete(logicalName);
  bump();
}

export function devtoolsPresenceSync(
  logicalName: string,
  metaCount: number,
  summary: string
): void {
  if (!IS_DEV) return;
  const row = presence.get(logicalName) ?? {
    metaCount: 0,
    lastSyncAt: null,
    lastEventSummary: null,
  };
  row.metaCount = metaCount;
  row.lastSyncAt = Date.now();
  row.lastEventSummary = summary;
  presence.set(logicalName, row);
  bump();
}

export function devtoolsPresenceTrack(
  logicalName: string,
  metaCount: number,
  metadataJson: string
): void {
  if (!IS_DEV) return;
  const row = presence.get(logicalName) ?? {
    metaCount: 0,
    lastSyncAt: null,
    lastEventSummary: null,
  };
  row.metaCount = metaCount;
  row.lastSyncAt = Date.now();
  row.lastEventSummary = `track ${metadataJson}`;
  presence.set(logicalName, row);
  bump();
}

// --- Debounce + silent refetch (from UI) ---

export function devtoolsDebounceArm(id: string, label: string, delayMs: number): void {
  if (!IS_DEV) return;
  const now = Date.now();
  debounces.set(id, {
    id,
    label,
    armedAt: now,
    firesAt: now + delayMs,
    delayMs,
  });
  bump();
}

export function devtoolsDebounceClear(id: string): void {
  if (!IS_DEV) return;
  debounces.delete(id);
  bump();
}

export function devtoolsDebounceFire(id: string): void {
  if (!IS_DEV) return;
  debounces.delete(id);
  bump();
}

export function devtoolsSilentRefetch(source: string): void {
  if (!IS_DEV) return;
  const at = Date.now();
  devConsoleGroup("Silent refetch", `${source} @ ${new Date(at).toLocaleTimeString()}`);
  silentRefetches.unshift({ source, at });
  if (silentRefetches.length > MAX_SILENT) silentRefetches.length = MAX_SILENT;
  bump();
}
