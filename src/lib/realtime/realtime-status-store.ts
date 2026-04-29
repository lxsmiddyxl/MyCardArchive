/**
 * Cross-cutting realtime health for UI (non-React callers from `channels.ts`).
 * Single subscriber-friendly snapshot for `useSyncExternalStore` (stable string snapshot).
 */

export type RealtimeBannerPhase = "hidden" | "retrying" | "reconnected" | "exhausted";

const listeners = new Set<() => void>();

const muxRetrying = new Set<string>();
const muxExhausted = new Set<string>();
const presenceFailed = new Set<string>();

let reconnectDeadlineMs: number | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

const RECONNECT_FLASH_MS = 2600;

function emit() {
  listeners.forEach((l) => {
    l();
  });
}

function clearReconnectFlashTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  }
  reconnectDeadlineMs = null;
}

function scheduleReconnectedFlash() {
  clearReconnectFlashTimer();
  reconnectDeadlineMs = Date.now() + RECONNECT_FLASH_MS;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined;
    reconnectDeadlineMs = null;
    emit();
  }, RECONNECT_FLASH_MS);
  emit();
}

function derivePhase(): RealtimeBannerPhase {
  if (muxExhausted.size > 0 || presenceFailed.size > 0) {
    return "exhausted";
  }
  if (muxRetrying.size > 0) {
    return "retrying";
  }
  if (reconnectDeadlineMs !== null && Date.now() < reconnectDeadlineMs) {
    return "reconnected";
  }
  return "hidden";
}

/** Stable primitive for `useSyncExternalStore` (Object.is). */
export function getRealtimeBannerPhase(): RealtimeBannerPhase {
  return derivePhase();
}

export function subscribeRealtimeBanner(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getServerRealtimeBannerPhase(): RealtimeBannerPhase {
  return "hidden";
}

/** Postgres mux: failure with an upcoming backoff reconnect. */
export function reportMuxRetrying(channelKey: string): void {
  clearReconnectFlashTimer();
  muxExhausted.delete(channelKey);
  muxRetrying.add(channelKey);
  emit();
}

/** Postgres mux: max retries reached for this multiplex key. */
export function reportMuxExhausted(channelKey: string): void {
  clearReconnectFlashTimer();
  muxRetrying.delete(channelKey);
  muxExhausted.add(channelKey);
  emit();
}

/**
 * Postgres mux: subscribe reached SUBSCRIBED.
 * `wasDegraded` — true if this channel had a prior failure/retry state (not first-time connect).
 */
export function reportMuxSubscribed(channelKey: string, wasDegraded: boolean): void {
  const hadRetry = muxRetrying.delete(channelKey);
  const hadExhausted = muxExhausted.delete(channelKey);
  if (wasDegraded && (hadRetry || hadExhausted)) {
    scheduleReconnectedFlash();
  } else if (hadRetry || hadExhausted) {
    emit();
  }
}

/** Last subscriber left; clear health flags for this key. */
export function reportMuxDisposed(channelKey: string): void {
  muxRetrying.delete(channelKey);
  muxExhausted.delete(channelKey);
  emit();
}

/** Presence: initial channel subscribe failed (ensurePresenceChannel). */
export function reportPresenceJoinFailed(channelName: string): void {
  clearReconnectFlashTimer();
  presenceFailed.add(channelName);
  emit();
}

/** Presence: track succeeded after channel was ready. */
export function reportPresenceJoinOk(channelName: string): void {
  if (presenceFailed.delete(channelName)) {
    scheduleReconnectedFlash();
  }
}

/** Presence: user left topic; clear stale failure flag. */
export function reportPresenceLeave(channelName: string): void {
  if (presenceFailed.delete(channelName)) {
    emit();
  }
}
