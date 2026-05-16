export type PresenceMode = "viewing" | "editing" | "scanning" | "adding";

export type PresenceEntry = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  mode: PresenceMode;
  lastActiveAt: number;
};

const TTL_MS = 60_000;
const MAX_PER_BINDER = 24;

type Store = {
  byBinder: Map<string, Map<string, PresenceEntry>>;
  byUser: Map<string, number>;
};

function store(): Store {
  const g = globalThis as typeof globalThis & { __mcaEphemeralPresence?: Store };
  if (!g.__mcaEphemeralPresence) {
    g.__mcaEphemeralPresence = {
      byBinder: new Map(),
      byUser: new Map(),
    };
  }
  return g.__mcaEphemeralPresence;
}

function pruneBinder(binderId: string, now: number): void {
  const s = store();
  const bucket = s.byBinder.get(binderId);
  if (!bucket) return;
  for (const [uid, entry] of bucket) {
    if (now - entry.lastActiveAt > TTL_MS) {
      bucket.delete(uid);
      s.byUser.delete(uid);
    }
  }
  if (bucket.size === 0) s.byBinder.delete(binderId);
}

export function pingPresence(input: {
  binderId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  mode: PresenceMode;
}): void {
  const now = Date.now();
  const s = store();
  pruneBinder(input.binderId, now);

  let bucket = s.byBinder.get(input.binderId);
  if (!bucket) {
    bucket = new Map();
    s.byBinder.set(input.binderId, bucket);
  }

  bucket.set(input.userId, {
    userId: input.userId,
    displayName: input.displayName,
    avatarUrl: input.avatarUrl ?? null,
    mode: input.mode,
    lastActiveAt: now,
  });
  s.byUser.set(input.userId, now);

  if (bucket.size > MAX_PER_BINDER) {
    const sorted = [...bucket.values()].sort((a, b) => b.lastActiveAt - a.lastActiveAt);
    for (const drop of sorted.slice(MAX_PER_BINDER)) {
      bucket.delete(drop.userId);
    }
  }
}

export function getBinderPresence(binderId: string): PresenceEntry[] {
  const now = Date.now();
  pruneBinder(binderId, now);
  const bucket = store().byBinder.get(binderId);
  if (!bucket) return [];
  return [...bucket.values()].sort((a, b) => b.lastActiveAt - a.lastActiveAt);
}

export function getUserLastActive(userId: string): number | null {
  return store().byUser.get(userId) ?? null;
}
