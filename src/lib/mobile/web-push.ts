/**
 * Web Push subscription (Phase 84). Requires NEXT_PUBLIC_VAPID_PUBLIC_KEY (URL-safe base64).
 */

import { mcaLog } from "@/lib/logging/mca-log-client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerWebPushSubscription(): Promise<boolean> {
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!vapid || typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    mcaLog.event(
      "mobile.push.register",
      { ok: false, reason: "unsupported_or_unconfigured" },
      { componentName: "web-push", surfaceName: "mobile" }
    );
    return false;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    // Copy into a fresh ArrayBuffer-backed view — PushManager typings expect BufferSource
    // compatible with ArrayBuffer (not SharedArrayBuffer / ArrayBufferLike).
    const vapidKey = new Uint8Array(urlBase64ToUint8Array(vapid));
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey,
    });
    const json = sub.toJSON();
    await fetch("/api/mobile/push/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: json }),
    });
    mcaLog.event(
      "mobile.push.register",
      { ok: true, endpointHost: json.endpoint ? new URL(json.endpoint).host : null },
      { componentName: "web-push", surfaceName: "mobile" }
    );
    return true;
  } catch {
    mcaLog.event("mobile.push.register", { ok: false, reason: "subscribe_failed" }, { componentName: "web-push", surfaceName: "mobile" });
    return false;
  }
}
