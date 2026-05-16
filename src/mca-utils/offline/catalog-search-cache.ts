import type { CatalogCardHit } from "@/lib/dto/catalog";

const DB_NAME = "mca-catalog-search-cache";
const DB_VERSION = 1;
const STORE = "searches";
const MAX_ENTRIES = 50;

export type CachedCatalogSearch = {
  cacheKey: string;
  query: string;
  mode: string;
  results: CatalogCardHit[];
  cachedAt: number;
};

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
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "cacheKey" });
        store.createIndex("cachedAt", "cachedAt", { unique: false });
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
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(cacheKey);
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
    return null;
  }
}

export async function writeCachedCatalogSearch(row: CachedCatalogSearch): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(row);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    const all = await new Promise<CachedCatalogSearch[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as CachedCatalogSearch[]) ?? []);
      req.onerror = () => reject(req.error);
    });

    if (all.length > MAX_ENTRIES) {
      const sorted = [...all].sort((a, b) => a.cachedAt - b.cachedAt);
      const drop = sorted.slice(0, all.length - MAX_ENTRIES);
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        for (const row of drop) store.delete(row.cacheKey);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
    db.close();
  } catch {
    /* quota / private mode */
  }
}

export async function listRecentCachedCatalogSearches(limit = 10): Promise<CachedCatalogSearch[]> {
  try {
    const db = await openDb();
    const rows = await new Promise<CachedCatalogSearch[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as CachedCatalogSearch[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return [...rows].sort((a, b) => b.cachedAt - a.cachedAt).slice(0, limit);
  } catch {
    return [];
  }
}
