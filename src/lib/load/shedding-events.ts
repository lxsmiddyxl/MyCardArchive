import "server-only";

export type SheddingEventRecord = {
  rule: string;
  ts: number;
  loadState: string;
  detail?: unknown;
};

const MAX = 32;
const events: SheddingEventRecord[] = [];

export function recordSheddingEvent(entry: Omit<SheddingEventRecord, "ts"> & { ts?: number }): void {
  events.push({ ...entry, ts: entry.ts ?? Date.now() });
  if (events.length > MAX) events.splice(0, events.length - MAX);
}

export function getRecentSheddingEvents(): readonly SheddingEventRecord[] {
  return [...events];
}

export function clearSheddingEventsForTests(): void {
  events.length = 0;
}
