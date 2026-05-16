/** HTML5 drag payload for binder slot moves (shared by grid + page view). */
export const BINDER_SLOT_DRAG_MIME = "application/x-mycardarchive-binder-slot";

export type BinderSlotRef = { page: number; slot: number };

export function serializeSlotDragPayload(ref: BinderSlotRef): string {
  return JSON.stringify(ref);
}

export function parseSlotDragPayload(raw: string): BinderSlotRef | null {
  if (!raw?.trim()) return null;
  try {
    const o = JSON.parse(raw) as { page?: unknown; slot?: unknown };
    if (typeof o.page !== "number" || typeof o.slot !== "number") return null;
    if (!Number.isFinite(o.page) || !Number.isFinite(o.slot)) return null;
    return {
      page: Math.max(0, Math.floor(o.page)),
      slot: Math.floor(o.slot),
    };
  } catch {
    return null;
  }
}

export function readSlotDragPayload(dataTransfer: DataTransfer): BinderSlotRef | null {
  let raw = "";
  try {
    raw = dataTransfer.getData(BINDER_SLOT_DRAG_MIME);
  } catch {
    /* ignore */
  }
  if (!raw) {
    try {
      raw = dataTransfer.getData("text/plain");
    } catch {
      /* ignore */
    }
  }
  return parseSlotDragPayload(raw);
}

export function isSameSlotRef(a: BinderSlotRef, b: BinderSlotRef): boolean {
  return a.page === b.page && a.slot === b.slot;
}

export function canDropSlot(from: BinderSlotRef, to: BinderSlotRef): boolean {
  return !isSameSlotRef(from, to);
}

/** Virtual slot key when no `binder_slots` row exists yet. */
export function slotCoordKey(page: number, slot: number): string {
  return `p${page}-s${slot}`;
}

const COORD_RE = /^p(\d+)-s(\d+)$/;

export function parseSlotCoordKey(
  key: string
): { page: number; slot: number } | null {
  const m = key.trim().match(COORD_RE);
  if (!m) return null;
  return { page: Number(m[1]), slot: Number(m[2]) };
}

export function isBinderSlotUuid(key: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(key.trim());
}
