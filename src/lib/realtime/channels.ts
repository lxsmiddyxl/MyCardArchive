/**
 * Supabase Realtime channel helpers (browser, user session via {@link supabaseBrowser}).
 * Requires tables to be in the `supabase_realtime` publication — see
 * `037_index_tables_delete_policies.sql`, `038_enable_realtime_publication.sql`,
 * `039_trade_items_realtime_publication.sql` and `docs/runbooks/realtime.md`.
 *
 * **Presence strategy (single canonical path):** {@link ensurePresenceChannel} is the only
 * way presence topics are created (single-flight per logical name). Callers use
 * {@link joinPresence} to {@link RealtimeChannel.track} metadata (always merged with `at`),
 * {@link subscribeToPresence} for mux’d sync/join/leave callbacks, and {@link leavePresence}
 * to untrack and remove the channel. Trade rooms use {@link presenceTradeRoom} +
 * {@link subscribeTradeRoomPresence}, which is implemented with the same join/subscribe/leave
 * flow—no separate channel construction.
 *
 * Presence uses a shared client and channel registry so `track` / `untrack` pair with the same
 * {@link RealtimeChannel}. Presence event listeners are multiplexed so subscribers can attach
 * after join without violating the SDK rule (no `channel.on('presence', …)` after subscribe).
 *
 * Postgres `postgres_changes` subscriptions are multiplexed per channel key so multiple
 * UI surfaces share one Realtime channel and one browser Supabase client.
 * Teardown is **null-first** (`entry.channel` cleared before `removeChannel`) with stale
 * subscribe guards so high-volume `postgres_changes` (e.g. marketplace, feed, community)
 * cannot recurse into mux removal.
 * Client-only — import from React client components or effects.
 */

import { mcaLog } from "@/lib/logging/mca-log-client";
import { presenceMetadataDigest } from "@/lib/realtime/presence-metadata-digest";
import { getTelemetryConnectionId } from "@/lib/telemetry/client-telemetry";
import { log } from "@/lib/logging/log";
import {
  reportMuxDisposed,
  reportMuxExhausted,
  reportMuxRetrying,
  reportMuxSubscribed,
  reportPresenceJoinFailed,
  reportPresenceJoinOk,
  reportPresenceLeave,
} from "@/lib/realtime/realtime-status-store";
import { supabaseBrowser } from "@/lib/supabase/browser";
import {
  devtoolsPostgresEvent,
  devtoolsPostgresRetry,
  devtoolsPostgresRetryExhausted,
  devtoolsPostgresSubscriberDelta,
  devtoolsPresenceSync,
  devtoolsPresenceTopicClosed,
  devtoolsPresenceTopicOpened,
  devtoolsPresenceTrack,
} from "@/lib/dev/realtime-devtools-state";
import {
  REALTIME_SUBSCRIBE_STATES,
  type RealtimeChannel,
  type RealtimePostgresChangesPayload,
  type RealtimePresenceJoinPayload,
  type RealtimePresenceLeavePayload,
} from "@supabase/supabase-js";

const MCA_REALTIME_CTX = { componentName: "realtime", surfaceName: "channels" } as const;

const DEV = process.env.NODE_ENV === "development";

/** Per-topic user id for telemetry (from last successful track). */
const presenceUserByTopic = new Map<string, string>();
const lastPresenceHeartbeatAt = new Map<string, number>();
const PRESENCE_HEARTBEAT_MIN_MS = 60_000;

/** Collapse high-frequency postgres / presence fan-out in DevTools (one group per event). */
function devRealtimeGroupCollapsed(label: string, run: () => void): void {
  if (!DEV) {
    run();
    return;
  }
  console.groupCollapsed(`%c${label}`, "color:#94a3b8;font-weight:normal");
  try {
    run();
  } finally {
    console.groupEnd();
  }
}

function summarizePostgresPayload(
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>
): string {
  const et = "eventType" in payload ? String(payload.eventType) : "?";
  const table = "table" in payload && payload.table ? String(payload.table) : "?";
  return `${et} ${table}`;
}

export type PostgresChangeCallback = (
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>
) => void;

/**
 * Canonical multiplex keys for {@link subscribePostgresMultiplexed} (one Realtime channel per key).
 * Stable strings — changing them would orphan active tabs until reload.
 */
export const REALTIME_MUX_KEYS = {
  notifications: (userId: string) => `notifications:${userId}`,
  activityLog: (userId: string) => `activity_log:${userId}`,
  trades: (userId: string) => `trades:${userId}`,
  tradeMessages: (tradeId: string) => `trade_messages:${tradeId}`,
  tradeItems: (tradeId: string) => `trade_items:${tradeId}`,
  matchingIndex: (userId: string) => `matching_index:${userId}`,
  /** `user_presence` row for a single trainer (optional live activity refresh). */
  userPresenceRow: (userId: string) => `user_presence_row:${userId}`,
} as const;

export type PresenceHandlers = {
  onSync?: () => void;
  onJoin?: (payload: RealtimePresenceJoinPayload<Record<string, unknown>>) => void;
  onLeave?: (payload: RealtimePresenceLeavePayload<Record<string, unknown>>) => void;
};

// --- Presence channel names (use with joinPresence / subscribeToPresence) ---

/** App-wide: who is online. */
export const PRESENCE_ONLINE_USERS = "online-users" as const;

/** Who is in a trade thread (pass `tradeId`). */
export function presenceTradeRoom(tradeId: string): string {
  return `trade-room-${tradeId}`;
}

/** Deck editor co-editing presence (pass `deckId`). */
export function presenceDeckEditor(deckId: string): string {
  return `deck-editor-${deckId}`;
}

/** Binder detail viewer presence (pass `binderId`). */
export function presenceBinderViewer(binderId: string): string {
  return `binder-viewer-${binderId}`;
}

/** Shared matching discovery hub (all trainers viewing /matching). */
export function presenceMatchingHub(): string {
  return "matching-discovery-hub";
}

type PresenceMuxEntry = {
  channel: RealtimeChannel;
  /** Resolves when the channel reaches SUBSCRIBED (single-flight). */
  ready: Promise<void>;
  onSync: Set<() => void>;
  onJoin: Set<(payload: RealtimePresenceJoinPayload<Record<string, unknown>>) => void>;
  onLeave: Set<(payload: RealtimePresenceLeavePayload<Record<string, unknown>>) => void>;
};

let presenceClientSingleton: ReturnType<typeof supabaseBrowser> | null = null;
const presenceRegistry = new Map<string, PresenceMuxEntry>();
const presenceTopicRefCount = new Map<string, number>();
const lastPresenceTrackDigest = new Map<string, string>();

function getPresenceClient(): ReturnType<typeof supabaseBrowser> {
  presenceClientSingleton ??= supabaseBrowser();
  return presenceClientSingleton;
}

let realtimePostgresClientSingleton: ReturnType<typeof supabaseBrowser> | null = null;

/** Shared browser client for multiplexed postgres realtime (one socket per tab). */
export function getRealtimePostgresClient(): ReturnType<typeof supabaseBrowser> {
  realtimePostgresClientSingleton ??= supabaseBrowser();
  return realtimePostgresClientSingleton;
}

/** Delays after each failed subscribe before reconnect (4 attempts max). */
const POSTGRES_MUX_RETRY_DELAYS_MS = [250, 500, 1000, 2000] as const;
const POSTGRES_MUX_MAX_RETRIES = 4;

type PostgresMuxEntry = {
  channel: RealtimeChannel | null;
  callbacks: Set<PostgresChangeCallback>;
  wire: (channel: RealtimeChannel, emit: PostgresChangeCallback) => void;
  emit: PostgresChangeCallback;
  retryTimer?: ReturnType<typeof setTimeout>;
  /** Failures since last SUBSCRIBED; used to index backoff and cap retries. */
  retryCount: number;
  /** No more auto-retry until {@link attachPostgresMuxChannel} after new subscriber or manual reset. */
  exhausted: boolean;
};

const postgresMuxRegistry = new Map<string, PostgresMuxEntry>();

/**
 * Detach the current mux {@link RealtimeChannel} without re-entering teardown.
 * Callers MUST set `entry.channel = null` *before* `supabase.removeChannel` so any
 * synchronous subscribe callbacks see a stale channel and bail (avoids recursion /
 * stack overflow when the SDK fires CLOSED during removal).
 */
function clearPostgresMuxChannelRef(
  entry: PostgresMuxEntry,
  supabase: ReturnType<typeof supabaseBrowser>,
  channelKey: string,
  reason: "replace" | "failure_cleanup" | "last_unsubscribe"
): RealtimeChannel | null {
  const ch = entry.channel;
  if (!ch) return null;
  entry.channel = null;
  log.realtime.debug("mux.channel.detach", { channelKey, reason });
  void supabase.removeChannel(ch);
  return ch;
}

function attachPostgresMuxChannel(
  channelKey: string,
  entry: PostgresMuxEntry,
  supabase: ReturnType<typeof supabaseBrowser>
): void {
  if (entry.channel) {
    clearPostgresMuxChannelRef(entry, supabase, channelKey, "replace");
  }
  const channel = supabase.channel(channelKey);
  entry.wire(channel, entry.emit);
  entry.channel = channel;
  const bound = channel;
  channel.subscribe((status, err) => {
    const reg = postgresMuxRegistry.get(channelKey);
    if (!reg || reg !== entry) return;
    if (entry.channel !== bound) return;

    if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
      const wasDegraded = entry.retryCount > 0 || entry.exhausted;
      entry.retryCount = 0;
      entry.exhausted = false;
      reportMuxSubscribed(channelKey, wasDegraded);
      log.realtime.debug("mux.subscribed", { channelKey });
      mcaLog.event(
        "realtime.postgres_mux.subscribed",
        { channelKey, wasDegraded },
        MCA_REALTIME_CTX
      );
      return;
    }
    if (
      status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR ||
      status === REALTIME_SUBSCRIBE_STATES.CLOSED ||
      status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT
    ) {
      handlePostgresMuxSubscribeFailure(channelKey, entry, supabase, status, err, bound);
    }
  });
}

function handlePostgresMuxSubscribeFailure(
  channelKey: string,
  entry: PostgresMuxEntry,
  supabase: ReturnType<typeof supabaseBrowser>,
  status: (typeof REALTIME_SUBSCRIBE_STATES)[keyof typeof REALTIME_SUBSCRIBE_STATES],
  err?: Error,
  fromChannel?: RealtimeChannel
): void {
  const still = postgresMuxRegistry.get(channelKey);
  if (!still || still !== entry) return;
  if (fromChannel !== undefined && entry.channel !== fromChannel) return;

  clearPostgresMuxChannelRef(entry, supabase, channelKey, "failure_cleanup");

  if (entry.callbacks.size === 0) {
    if (entry.retryTimer) {
      clearTimeout(entry.retryTimer);
      entry.retryTimer = undefined;
    }
    reportMuxDisposed(channelKey);
    postgresMuxRegistry.delete(channelKey);
    return;
  }

  if (entry.retryCount >= POSTGRES_MUX_MAX_RETRIES) {
    entry.exhausted = true;
    reportMuxExhausted(channelKey);
    log.realtime.warn("mux.retry_exhausted", {
      channelKey,
      status: String(status),
      err: err?.message,
    });
    mcaLog.warn(
      "realtime.postgres_mux.failure",
      {
        channelKey,
        status: String(status),
        err: err?.message ?? null,
      },
      MCA_REALTIME_CTX
    );
    if (DEV) {
      devtoolsPostgresRetryExhausted(channelKey, String(status));
    }
    return;
  }

  const delayMs = POSTGRES_MUX_RETRY_DELAYS_MS[entry.retryCount];
  entry.retryCount += 1;
  reportMuxRetrying(channelKey);
  mcaLog.warn(
    "realtime.postgres_mux.retry_scheduled",
    {
      channelKey,
      attempt: entry.retryCount,
      delayMs,
      status: String(status),
    },
    MCA_REALTIME_CTX
  );

  log.realtime.debug("mux.retry_scheduled", {
    channelKey,
    attempt: entry.retryCount,
    maxAttempts: POSTGRES_MUX_MAX_RETRIES,
    delayMs,
    status: String(status),
  });
  if (DEV) {
    devtoolsPostgresRetry(channelKey, entry.retryCount, delayMs, String(status));
  }

  if (entry.retryTimer) {
    clearTimeout(entry.retryTimer);
  }
  entry.retryTimer = setTimeout(() => {
    entry.retryTimer = undefined;
    const e = postgresMuxRegistry.get(channelKey);
    if (!e || e.callbacks.size === 0) return;
    attachPostgresMuxChannel(channelKey, e, supabase);
  }, delayMs);
}

/**
 * Synchronous member count when this tab has the topic active (0 if not joined yet).
 * Prefer over {@link getPresenceMemberCount} in hot paths after join to avoid an extra tick.
 */
export function getPresenceMemberCountSync(channelName: string): number {
  return countPresenceMetas(channelName);
}

/** Total presence metas on a topic (connections × metas per key). */
function countPresenceMetas(channelName: string): number {
  const entry = presenceRegistry.get(channelName);
  if (!entry) return 0;
  const state = entry.channel.presenceState();
  let total = 0;
  for (const key of Object.keys(state)) {
    const metas = state[key];
    if (Array.isArray(metas)) total += metas.length;
  }
  return total;
}

function subscribePostgresMultiplexed(
  channelKey: string,
  wire: (channel: RealtimeChannel, emit: PostgresChangeCallback) => void,
  callback: PostgresChangeCallback
): () => void {
  const supabase = getRealtimePostgresClient();
  let entry = postgresMuxRegistry.get(channelKey);
  if (!entry) {
    const callbacks = new Set<PostgresChangeCallback>();
    const emit: PostgresChangeCallback = (payload) => {
      if (DEV) {
        devtoolsPostgresEvent(channelKey, summarizePostgresPayload(payload));
      }
      const summary = summarizePostgresPayload(payload);
      devRealtimeGroupCollapsed(`[MCA realtime] Postgres · mux emit · ${channelKey} · ${summary}`, () => {
        callbacks.forEach((cb) => {
          try {
            cb(payload);
          } catch (e) {
            log.realtime.warn("mux.emit.callback_error", {
              channelKey,
              err: e instanceof Error ? e.message : String(e),
            });
          }
        });
      });
    };
    entry = {
      channel: null,
      callbacks,
      wire,
      emit,
      retryTimer: undefined,
      retryCount: 0,
      exhausted: false,
    };
    postgresMuxRegistry.set(channelKey, entry);
    log.realtime.debug("mux.entry.created", { channelKey });
    attachPostgresMuxChannel(channelKey, entry, supabase);
  } else {
    entry.wire = wire;
  }
  entry.callbacks.add(callback);
  if (DEV) {
    devtoolsPostgresSubscriberDelta(channelKey, 1);
  }
  if (entry.exhausted && entry.channel === null && entry.callbacks.size > 0) {
    log.realtime.debug("mux.reconnect_after_exhausted", { channelKey });
    attachPostgresMuxChannel(channelKey, entry, supabase);
  }
  return () => {
    const e = postgresMuxRegistry.get(channelKey);
    if (!e) return;
    e.callbacks.delete(callback);
    if (DEV) {
      devtoolsPostgresSubscriberDelta(channelKey, -1);
    }
    if (e.callbacks.size === 0) {
      if (e.retryTimer) {
        clearTimeout(e.retryTimer);
        e.retryTimer = undefined;
      }
      postgresMuxRegistry.delete(channelKey);
      clearPostgresMuxChannelRef(e, supabase, channelKey, "last_unsubscribe");
      reportMuxDisposed(channelKey);
      log.realtime.debug("mux.entry.disposed", { channelKey });
    }
  };
}

/**
 * Subscribe to the presence topic once per logical name, then {@link RealtimeChannel.track} metadata.
 * Merges `metadata` with optional `viewing_trade_id` / `viewing_profile_id` for UI routing.
 */
export async function joinPresence(
  channelName: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const trackStarted =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const channel = await ensurePresenceChannel(channelName);
  const digest = `${channelName}:${presenceMetadataDigest(metadata)}`;
  if (lastPresenceTrackDigest.get(channelName) === digest) {
    log.presence.info("presence.track.deduped", { channel: channelName });
    return;
  }
  const payload = {
    ...metadata,
    at: new Date().toISOString(),
  };
  const res = await channel.track(payload);
  if (res !== "ok") {
    reportPresenceJoinFailed(channelName);
    const uid = typeof metadata.user_id === "string" ? metadata.user_id : undefined;
    mcaLog.warn(
      "realtime.presence.track_failed",
      {
        connectionId: getTelemetryConnectionId(),
        channelName,
        error: String(res),
        latencyMs:
          typeof performance !== "undefined"
            ? Math.round(performance.now() - trackStarted)
            : undefined,
        userId: uid,
      },
      MCA_REALTIME_CTX
    );
    throw new Error(`Presence track failed: ${String(res)}`);
  }
  lastPresenceTrackDigest.set(channelName, digest);
  const uid = typeof metadata.user_id === "string" ? metadata.user_id : undefined;
  if (uid) {
    presenceUserByTopic.set(channelName, uid);
  }
  const latencyMs =
    typeof performance !== "undefined"
      ? Math.round(performance.now() - trackStarted)
      : undefined;
  mcaLog.event(
    "realtime.presence.connected",
    {
      connectionId: getTelemetryConnectionId(),
      channelName,
      latencyMs,
      userId: uid,
    },
    MCA_REALTIME_CTX
  );
  mcaLog.event(
    "presence.join",
    {
      connectionId: getTelemetryConnectionId(),
      channelName,
      userId: uid,
      latencyMs,
    },
    MCA_REALTIME_CTX
  );
  reportPresenceJoinOk(channelName);
  presenceTopicRefCount.set(channelName, (presenceTopicRefCount.get(channelName) ?? 0) + 1);
  log.presence.info("track", { channel: channelName, metaKeys: Object.keys(metadata) });
  if (DEV) {
    devtoolsPresenceTrack(
      channelName,
      countPresenceMetas(channelName),
      JSON.stringify(payload)
    );
  }
}

/** Stop tracking and tear down the channel for this logical name. */
export async function leavePresence(channelName: string): Promise<void> {
  const refs = presenceTopicRefCount.get(channelName) ?? 0;
  if (refs > 1) {
    presenceTopicRefCount.set(channelName, refs - 1);
    log.presence.info("leave.deferred", { channel: channelName, refsRemaining: refs - 1 });
    return;
  }
  presenceTopicRefCount.delete(channelName);

  const supabase = getPresenceClient();
  const entry = presenceRegistry.get(channelName);
  if (!entry) return;
  const uid = presenceUserByTopic.get(channelName);
  const ch = entry.channel;
  presenceUserByTopic.delete(channelName);
  lastPresenceHeartbeatAt.delete(channelName);
  try {
    await ch.untrack();
  } catch {
    /* untrack best-effort */
  }
  presenceRegistry.delete(channelName);
  mcaLog.event(
    "realtime.presence.disconnected",
    {
      connectionId: getTelemetryConnectionId(),
      channelName,
      userId: uid,
    },
    MCA_REALTIME_CTX
  );
  mcaLog.event(
    "presence.leave",
    {
      connectionId: getTelemetryConnectionId(),
      channelName,
      userId: uid,
    },
    MCA_REALTIME_CTX
  );
  reportPresenceLeave(channelName);
  log.presence.info("leave", { channel: channelName });
  log.realtime.debug("presence.channel.detach", { channelName });
  void supabase.removeChannel(ch);
  lastPresenceTrackDigest.delete(channelName);
  if (DEV) {
    devtoolsPresenceTopicClosed(channelName);
  }
}

async function ensurePresenceChannel(channelName: string): Promise<RealtimeChannel> {
  let entry = presenceRegistry.get(channelName);
  if (entry) {
    await entry.ready;
    return entry.channel;
  }

  const supabase = getPresenceClient();
  const onSync = new Set<() => void>();
  const onJoin = new Set<(payload: RealtimePresenceJoinPayload<Record<string, unknown>>) => void>();
  const onLeave = new Set<(payload: RealtimePresenceLeavePayload<Record<string, unknown>>) => void>();

  const channel = supabase.channel(`presence:${channelName}`, {
    config: { presence: { enabled: true } },
  });
  const presenceCh = channel;

  channel.on("presence", { event: "sync" }, () => {
    devRealtimeGroupCollapsed(`[MCA realtime] Presence · sync · ${channelName}`, () => {
      onSync.forEach((fn) => {
        fn();
      });
    });
    const now = Date.now();
    const last = lastPresenceHeartbeatAt.get(channelName) ?? 0;
    if (now - last >= PRESENCE_HEARTBEAT_MIN_MS) {
      lastPresenceHeartbeatAt.set(channelName, now);
      mcaLog.event(
        "realtime.presence.heartbeat",
        {
          connectionId: getTelemetryConnectionId(),
          channelName,
          userId: presenceUserByTopic.get(channelName),
        },
        MCA_REALTIME_CTX
      );
    }
    if (DEV) {
      const n = countPresenceMetas(channelName);
      devtoolsPresenceSync(channelName, n, `sync metas=${n}`);
    }
  });
  channel.on("presence", { event: "join" }, (payload) => {
    devRealtimeGroupCollapsed(`[MCA realtime] Presence · join · ${channelName}`, () => {
      onJoin.forEach((fn) => {
        fn(payload);
      });
    });
    if (DEV) {
      const n = countPresenceMetas(channelName);
      devtoolsPresenceSync(channelName, n, `join keys=${Object.keys(payload).length}`);
    }
  });
  channel.on("presence", { event: "leave" }, (payload) => {
    devRealtimeGroupCollapsed(`[MCA realtime] Presence · leave · ${channelName}`, () => {
      onLeave.forEach((fn) => {
        fn(payload);
      });
    });
    if (DEV) {
      const n = countPresenceMetas(channelName);
      devtoolsPresenceSync(channelName, n, `leave keys=${Object.keys(payload).length}`);
    }
  });

  let resolveReady!: () => void;
  let rejectReady!: (e: unknown) => void;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  entry = { channel, ready, onSync, onJoin, onLeave };
  presenceRegistry.set(channelName, entry);
  if (DEV) {
    devtoolsPresenceTopicOpened(channelName);
  }

  channel.subscribe((status, err) => {
    const cur = presenceRegistry.get(channelName);
    const alive = Boolean(cur && cur.channel === presenceCh);
    const ok = status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED;
    mcaLog.event(
      "realtime.presence.subscribe_status",
      {
        connectionId: getTelemetryConnectionId(),
        channelName,
        status: String(status),
        error: err?.message ?? null,
        ok,
        userId: presenceUserByTopic.get(channelName),
      },
      MCA_REALTIME_CTX
    );
    if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
      if (!alive) {
        rejectReady(new Error("presence channel superseded before subscribe"));
        return;
      }
      resolveReady();
      return;
    }
    if (
      status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR ||
      status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT ||
      status === REALTIME_SUBSCRIBE_STATES.CLOSED
    ) {
      rejectReady(err ?? new Error(String(status)));
    }
  });

  try {
    await ready;
  } catch (e) {
    reportPresenceJoinFailed(channelName);
    presenceRegistry.delete(channelName);
    log.realtime.debug("presence.channel.detach_error_path", { channelName });
    void supabase.removeChannel(presenceCh);
    if (DEV) {
      devtoolsPresenceTopicClosed(channelName);
    }
    throw e;
  }

  return channel;
}

/** Count tracked presence entries on a topic (connections × metas per key). */
export async function getPresenceMemberCount(channelName: string): Promise<number> {
  await ensurePresenceChannel(channelName);
  return countPresenceMetas(channelName);
}

/**
 * Read presence metas from the unified registry only — no channel creation.
 * Returns empty if this tab has not subscribed / joined that logical topic yet.
 */
function getPresenceMetasSnapshot(channelName: string): Array<Record<string, unknown>> {
  const entry = presenceRegistry.get(channelName);
  if (!entry) return [];
  const state = entry.channel.presenceState() as Record<string, unknown[]>;
  const out: Array<Record<string, unknown>> = [];
  for (const key of Object.keys(state)) {
    const metas = state[key];
    if (!Array.isArray(metas)) continue;
    for (const m of metas) {
      if (m && typeof m === "object" && !Array.isArray(m)) {
        out.push(m as Record<string, unknown>);
      }
    }
  }
  return out;
}

/** True if `userId` appears on the app-wide online-users topic (registry must be active). */
export function isUserOnlineAppWide(userId: string): boolean {
  return getPresenceMetasSnapshot(PRESENCE_ONLINE_USERS).some(
    (m) => String(m.user_id ?? "") === userId
  );
}

/** True if the partner is in the trade-room topic with this trade id (registry must be active). */
export function isPartnerViewingTrade(tradeId: string, partnerUserId: string): boolean {
  const name = presenceTradeRoom(tradeId);
  return getPresenceMetasSnapshot(name).some(
    (m) =>
      String(m.user_id ?? "") === partnerUserId &&
      String(m.viewing_trade_id ?? "") === tradeId
  );
}

/**
 * Inserts, updates, deletes on `notifications` for this user (RLS also applies).
 */
export function subscribeToNotifications(
  userId: string,
  callback: PostgresChangeCallback
): () => void {
  const key = REALTIME_MUX_KEYS.notifications(userId);
  return subscribePostgresMultiplexed(
    key,
    (channel, emit) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        emit
      );
    },
    callback
  );
}

/**
 * Inserts, updates, deletes on `activity_log` for this user (RLS also applies).
 */
export function subscribeToActivityLog(
  userId: string,
  callback: PostgresChangeCallback
): () => void {
  const key = REALTIME_MUX_KEYS.activityLog(userId);
  return subscribePostgresMultiplexed(
    key,
    (channel, emit) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activity_log",
          filter: `user_id=eq.${userId}`,
        },
        emit
      );
    },
    callback
  );
}

/**
 * Trades where the user is `created_by` or `counterparty_id`.
 * No row filter: RLS limits events to rows the session may select.
 */
export function subscribeToTrades(userId: string, callback: PostgresChangeCallback): () => void {
  const key = REALTIME_MUX_KEYS.trades(userId);
  return subscribePostgresMultiplexed(
    key,
    (channel, emit) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trades",
        },
        emit
      );
    },
    callback
  );
}

/**
 * Messages for a single trade thread.
 */
export function subscribeToTradeMessages(
  tradeId: string,
  callback: PostgresChangeCallback
): () => void {
  const key = REALTIME_MUX_KEYS.tradeMessages(tradeId);
  return subscribePostgresMultiplexed(
    key,
    (channel, emit) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trade_messages",
          filter: `trade_id=eq.${tradeId}`,
        },
        emit
      );
    },
    callback
  );
}

/**
 * Inserts, updates, deletes on `trade_items` for a single trade (RLS applies).
 */
export function subscribeToTradeItems(
  tradeId: string,
  callback: PostgresChangeCallback
): () => void {
  const key = REALTIME_MUX_KEYS.tradeItems(tradeId);
  return subscribePostgresMultiplexed(
    key,
    (channel, emit) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trade_items",
          filter: `trade_id=eq.${tradeId}`,
        },
        emit
      );
    },
    callback
  );
}

/**
 * Trade thread presence: track the current user and report how many *other* connections are in the room.
 * Implemented with {@link joinPresence} + {@link subscribeToPresence} + {@link leavePresence}
 * on {@link presenceTradeRoom} (same registry path as the rest of the app).
 */
export function subscribeTradeRoomPresence(
  tradeId: string,
  currentUserId: string,
  onOthersCount: (count: number) => void
): () => void {
  const name = presenceTradeRoom(tradeId);
  let disposed = false;
  let unsubPresence: (() => void) | undefined;

  const recount = () => {
    if (disposed) return;
    const total = countPresenceMetas(name);
    onOthersCount(Math.max(0, total - 1));
  };

  void (async () => {
    try {
      await joinPresence(name, { user_id: currentUserId, viewing_trade_id: tradeId });
      if (disposed) {
        void leavePresence(name);
        return;
      }
      unsubPresence = subscribeToPresence(name, {
        onSync: recount,
        onJoin: recount,
        onLeave: recount,
      });
      if (disposed) {
        unsubPresence();
        unsubPresence = undefined;
        void leavePresence(name);
        return;
      }
      recount();
    } catch {
      /* presence unavailable */
    }
  })();

  return () => {
    disposed = true;
    unsubPresence?.();
    void leavePresence(name);
  };
}

/**
 * Presence sync / join / leave on a named topic.
 * Multiplexed on the same channel as {@link joinPresence} / {@link ensurePresenceChannel}.
 */
export function subscribeToPresence(channelName: string, handlers: PresenceHandlers): () => void {
  let disposed = false;
  const teardown: Array<() => void> = [];

  void (async () => {
    try {
      await ensurePresenceChannel(channelName);
      if (disposed) return;

      const entry = presenceRegistry.get(channelName);
      if (!entry) return;

      if (handlers.onSync) {
        const fn = () => {
          if (!disposed) handlers.onSync?.();
        };
        entry.onSync.add(fn);
        teardown.push(() => {
          entry.onSync.delete(fn);
        });
      }
      if (handlers.onJoin) {
        const fn = (payload: RealtimePresenceJoinPayload<Record<string, unknown>>) => {
          if (!disposed) handlers.onJoin?.(payload);
        };
        entry.onJoin.add(fn);
        teardown.push(() => {
          entry.onJoin.delete(fn);
        });
      }
      if (handlers.onLeave) {
        const fn = (payload: RealtimePresenceLeavePayload<Record<string, unknown>>) => {
          if (!disposed) handlers.onLeave?.(payload);
        };
        entry.onLeave.add(fn);
        teardown.push(() => {
          entry.onLeave.delete(fn);
        });
      }
    } catch {
      /* channel subscribe failed */
    }
  })();

  return () => {
    disposed = true;
    teardown.forEach((t) => {
      t();
    });
  };
}

/**
 * Have / want index rows for this user (two tables, one logical subscription).
 */
export function subscribeToMatchingIndex(
  userId: string,
  callback: PostgresChangeCallback
): () => void {
  const key = REALTIME_MUX_KEYS.matchingIndex(userId);
  const filter = `user_id=eq.${userId}`;

  return subscribePostgresMultiplexed(
    key,
    (channel, emit) => {
      channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_havelist_index",
            filter,
          },
          emit
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_wantlist_index",
            filter,
          },
          emit
        );
    },
    callback
  );
}

/**
 * Inserts / updates on `user_presence` for one user (requires SELECT RLS + realtime publication).
 */
export function subscribeToUserPresenceRow(
  userId: string,
  callback: PostgresChangeCallback
): () => void {
  const key = REALTIME_MUX_KEYS.userPresenceRow(userId);
  return subscribePostgresMultiplexed(
    key,
    (channel, emit) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
          filter: `user_id=eq.${userId}`,
        },
        emit
      );
    },
    callback
  );
}

// --- Dev-only chaos / stress harness (not for production callers) ---

/** Mux key used exclusively by {@link devChaosAttachPostgresSink} (synthetic emits only). */
export const DEV_CHAOS_POSTGRES_MUX_KEY = "__mca_dev_chaos_postgres__" as const;

/** Logical presence topic for join/leave churn tests (isolated from app topics). */
export const DEV_CHAOS_PRESENCE_TOPIC = "__mca_chaos_presence__" as const;

/**
 * Attach a postgres mux subscriber whose channel has **no** `postgres_changes` listeners —
 * payloads are delivered only via {@link devChaosEmitSyntheticPostgres}.
 */
export function devChaosAttachPostgresSink(callback: PostgresChangeCallback): () => void {
  if (!DEV) {
    return () => {};
  }
  return subscribePostgresMultiplexed(
    DEV_CHAOS_POSTGRES_MUX_KEY,
    (_channel, _emit) => {
      /* Intentionally empty: no server events; synthetic only. */
    },
    callback
  );
}

/**
 * Fan out a synthetic payload through the chaos mux (same path as realtime `emit`).
 * Returns false if the chaos sink is not attached.
 */
export function devChaosEmitSyntheticPostgres(
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>
): boolean {
  if (!DEV) {
    return false;
  }
  const entry = postgresMuxRegistry.get(DEV_CHAOS_POSTGRES_MUX_KEY);
  if (!entry) {
    return false;
  }
  entry.emit(payload);
  return true;
}
