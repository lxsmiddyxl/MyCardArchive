/**
 * IndexedDB offline cache: catalog search + pending card adds (Phase 4).
 */

import type { CatalogCardHit } from "@/lib/dto/catalog";

const DB_NAME = "mca-offline-cache-v2";
const DB_VERSION = 2;
const SEARCH_STORE = "catalog_searches";
const PENDING_STORE = "pending_card_adds";
const PENDING_SCAN_STORE = "pending_scans";
const MAX_SEARCH = 50;
const MAX_PENDING = 40;
const MAX_PENDING_SCANS = 12;
const LEGACY_LS_KEY = "mca:pending-card-adds:v1";

export type CachedCatalogSearch = {
  cacheKey: string;
  query: string;
  mode: string;
  results: CatalogCardHit[];
  cachedAt: number;
};

export type PendingCardAdd = {
  id: string;
  binderId: string;
  body: Record<string, unknown>;
  createdAt: number;
  lastError?: string | null;
  syncAttempts?: number;
};

export type PendingScan = {
  id: string;
  binderId: string | null;
  imageBase64: string;
  backImageBase64: string | null;
  mimeType: string;
  createdAt: number;
  lastError?: string | null;
  syncAttempts?: number;
};

/** In-memory fallback when IndexedDB is unavailable (SSR, unit tests). */
const memoryPending = new Map<string, PendingCardAdd>();
const memoryPendingScans = new Map<string, PendingScan>();
const memorySearch = new Map<string, CachedCatalogSearch>();

function sortPending(rows: PendingCardAdd[]): PendingCardAdd[] {
  return [...rows].sort((a, b) => a.createdAt - b.createdAt);
}

function trimMemoryPending(): void {
  const all = sortPending([...memoryPending.values()]);
  if (all.length <= MAX_PENDING) return;
  for (const drop of all.slice(0, all.length - MAX_PENDING)) {
    memoryPending.delete(drop.id);
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("idb open failed"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SEARCH_STORE)) {
        db.createObjectStore(SEARCH_STORE, { keyPath: "cacheKey" });
      }
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(PENDING_SCAN_STORE)) {
        db.createObjectStore(PENDING_SCAN_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

export function catalogSearchCacheKey(query: string, mode: string, setId?: string): string {
  return `${mode}|${setId?.trim() ?? ""}|${query.trim().toLowerCase()}`;
}

export async function readCachedCatalogSearch(
  cacheKey: string
): Promise<CachedCatalogSearch | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(SEARCH_STORE, "readonly");
      const req = tx.objectStore(SEARCH_STORE).get(cacheKey);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as CachedCatalogSearch | undefined) ?? null);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return memorySearch.get(cacheKey) ?? null;
  }
}

export async function writeCachedCatalogSearch(row: CachedCatalogSearch): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SEARCH_STORE, "readwrite");
      tx.objectStore(SEARCH_STORE).put(row);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    const all = await new Promise<CachedCatalogSearch[]>((resolve, reject) => {
      const tx = db.transaction(SEARCH_STORE, "readonly");
      const req = tx.objectStore(SEARCH_STORE).getAll();
      req.onsuccess = () => resolve((req.result as CachedCatalogSearch[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (all.length > MAX_SEARCH) {
      const sorted = [...all].sort((a, b) => a.cachedAt - b.cachedAt);
      for (const drop of sorted.slice(0, all.length - MAX_SEARCH)) {
        const db2 = await openDb();
        await new Promise<void>((resolve, reject) => {
          const tx = db2.transaction(SEARCH_STORE, "readwrite");
          tx.objectStore(SEARCH_STORE).delete(drop.cacheKey);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        db2.close();
      }
    }
  } catch {
    memorySearch.set(row.cacheKey, row);
    if (memorySearch.size > MAX_SEARCH) {
      const sorted = [...memorySearch.values()].sort((a, b) => a.cachedAt - b.cachedAt);
      for (const drop of sorted.slice(0, memorySearch.size - MAX_SEARCH)) {
        memorySearch.delete(drop.cacheKey);
      }
    }
  }
}

function migrateLegacyPending(): PendingCardAdd[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(LEGACY_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    localStorage.removeItem(LEGACY_LS_KEY);
    return parsed as PendingCardAdd[];
  } catch {
    return [];
  }
}

let migrated = false;

async function ensureLegacyMigrated(): Promise<void> {
  if (migrated) return;
  migrated = true;
  for (const row of migrateLegacyPending()) {
    try {
      const db = await openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(PENDING_STORE, "readwrite");
        tx.objectStore(PENDING_STORE).put(row);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch {
      memoryPending.set(row.id, row);
    }
  }
}

export async function listPendingCardAdds(): Promise<PendingCardAdd[]> {
  try {
    await ensureLegacyMigrated();
    const db = await openDb();
    const rows = await new Promise<PendingCardAdd[]>((resolve, reject) => {
      const tx = db.transaction(PENDING_STORE, "readonly");
      const req = tx.objectStore(PENDING_STORE).getAll();
      req.onsuccess = () => resolve((req.result as PendingCardAdd[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return sortPending(rows);
  } catch {
    const legacy = migrateLegacyPending();
    for (const row of legacy) memoryPending.set(row.id, row);
    return sortPending([...memoryPending.values()]);
  }
}

export async function enqueuePendingCardAdd(
  binderId: string,
  body: Record<string, unknown>
): Promise<string> {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const row: PendingCardAdd = { id, binderId, body, createdAt: Date.now(), syncAttempts: 0 };
  try {
    await ensureLegacyMigrated();
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PENDING_STORE, "readwrite");
      tx.objectStore(PENDING_STORE).put(row);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    const all = await listPendingCardAdds();
    if (all.length > MAX_PENDING) {
      for (const drop of all.slice(0, all.length - MAX_PENDING)) {
        await removePendingCardAdd(drop.id);
      }
    }
  } catch {
    memoryPending.set(id, row);
    trimMemoryPending();
  }
  return id;
}

export async function removePendingCardAdd(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PENDING_STORE, "readwrite");
      tx.objectStore(PENDING_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    memoryPending.delete(id);
  }
}

export async function markPendingCardAddError(id: string, message: string): Promise<void> {
  const rows = await listPendingCardAdds();
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  const next: PendingCardAdd = {
    ...row,
    lastError: message,
    syncAttempts: (row.syncAttempts ?? 0) + 1,
  };
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PENDING_STORE, "readwrite");
      tx.objectStore(PENDING_STORE).put(next);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    memoryPending.set(id, next);
  }
}

export async function pendingCountForBinder(binderId: string): Promise<number> {
  const rows = await listPendingCardAdds();
  return rows.filter((r) => r.binderId === binderId).length;
}

function sortPendingScans(rows: PendingScan[]): PendingScan[] {
  return [...rows].sort((a, b) => a.createdAt - b.createdAt);
}

export async function listPendingScans(): Promise<PendingScan[]> {
  try {
    const db = await openDb();
    const rows = await new Promise<PendingScan[]>((resolve, reject) => {
      const tx = db.transaction(PENDING_SCAN_STORE, "readonly");
      const req = tx.objectStore(PENDING_SCAN_STORE).getAll();
      req.onsuccess = () => resolve((req.result as PendingScan[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return sortPendingScans(rows);
  } catch {
    return sortPendingScans([...memoryPendingScans.values()]);
  }
}

export async function enqueuePendingScan(input: {
  binderId?: string | null;
  imageBase64: string;
  backImageBase64?: string | null;
  mimeType: string;
}): Promise<string> {
  const id = `scan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const row: PendingScan = {
    id,
    binderId: input.binderId?.trim() || null,
    imageBase64: input.imageBase64,
    backImageBase64: input.backImageBase64 ?? null,
    mimeType: input.mimeType,
    createdAt: Date.now(),
    syncAttempts: 0,
  };
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PENDING_SCAN_STORE, "readwrite");
      tx.objectStore(PENDING_SCAN_STORE).put(row);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    const all = await listPendingScans();
    if (all.length > MAX_PENDING_SCANS) {
      for (const drop of all.slice(0, all.length - MAX_PENDING_SCANS)) {
        await removePendingScan(drop.id);
      }
    }
  } catch {
    memoryPendingScans.set(id, row);
    if (memoryPendingScans.size > MAX_PENDING_SCANS) {
      const sorted = sortPendingScans([...memoryPendingScans.values()]);
      for (const drop of sorted.slice(0, memoryPendingScans.size - MAX_PENDING_SCANS)) {
        memoryPendingScans.delete(drop.id);
      }
    }
  }
  return id;
}

export async function removePendingScan(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PENDING_SCAN_STORE, "readwrite");
      tx.objectStore(PENDING_SCAN_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    memoryPendingScans.delete(id);
  }
}

export async function markPendingScanError(id: string, message: string): Promise<void> {
  const rows = await listPendingScans();
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  const next: PendingScan = {
    ...row,
    lastError: message,
    syncAttempts: (row.syncAttempts ?? 0) + 1,
  };
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PENDING_SCAN_STORE, "readwrite");
      tx.objectStore(PENDING_SCAN_STORE).put(next);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    memoryPendingScans.set(id, next);
  }
}
