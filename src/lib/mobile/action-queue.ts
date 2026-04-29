"use client";

import { mcaLog } from "@/lib/logging/mca-log-client";

const KEY = "mca_mobile_action_queue_v1";

export type QueuedAction = {
  id: string;
  kind: "noop" | "ping";
  createdAt: number;
};

function readQueue(): QueuedAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as QueuedAction[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(q: QueuedAction[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(q.slice(-40)));
}

export function enqueueMobileAction(action: Omit<QueuedAction, "createdAt">) {
  const q = readQueue();
  q.push({ ...action, createdAt: Date.now() });
  writeQueue(q);
  void tryRegisterBackgroundSync();
}

export function flushMobileActionQueue() {
  const q = readQueue();
  if (q.length === 0) return;
  writeQueue([]);
  mcaLog.event(
    "mobile.background_sync",
    { flushed: q.length, kinds: q.map((a) => a.kind) },
    { componentName: "action-queue", surfaceName: "mobile" }
  );
}

async function tryRegisterBackgroundSync() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    if ("sync" in reg && typeof (reg as ServiceWorkerRegistration & { sync?: { register: (t: string) => Promise<void> } }).sync?.register === "function") {
      await (reg as ServiceWorkerRegistration & { sync: { register: (t: string) => Promise<void> } }).sync.register("mca-sync");
    }
  } catch {
    /* optional */
  }
}

export function initMobileActionQueueListeners(): () => void {
  if (typeof window === "undefined") return () => {};
  const onOnline = () => {
    flushMobileActionQueue();
  };
  window.addEventListener("online", onOnline);
  return () => window.removeEventListener("online", onOnline);
}
