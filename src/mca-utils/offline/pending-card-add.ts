/**
 * Offline pending binder card creates (manual add Phase 3).
 */

const STORAGE_KEY = "mca:pending-card-adds:v1";
const MAX = 40;

export type PendingCardAdd = {
  id: string;
  binderId: string;
  body: Record<string, unknown>;
  createdAt: number;
};

function readAll(): PendingCardAdd[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as PendingCardAdd[]) : [];
  } catch {
    return [];
  }
}

function writeAll(rows: PendingCardAdd[]): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(-MAX)));
  } catch {
    /* quota */
  }
}

export function enqueuePendingCardAdd(
  binderId: string,
  body: Record<string, unknown>
): string {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  writeAll([...readAll(), { id, binderId, body, createdAt: Date.now() }]);
  return id;
}

export function listPendingCardAdds(): PendingCardAdd[] {
  return readAll();
}

export function removePendingCardAdd(id: string): void {
  writeAll(readAll().filter((r) => r.id !== id));
}

export function pendingCountForBinder(binderId: string): number {
  return readAll().filter((r) => r.binderId === binderId).length;
}
