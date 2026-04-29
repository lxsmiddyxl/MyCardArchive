"use client";

import { Button } from "@/mca-ui/button";
import { Panel } from "@/mca-ui/panel";
import { registerWebPushSubscription } from "@/lib/mobile/web-push";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { useCallback, useEffect, useState } from "react";

export function MobileNotificationsClient() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker?.addEventListener) return;
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string } | undefined;
      if (d?.type === "mca-push") {
        mcaLog.event("mobile.push.receive", { channel: "sw" }, { componentName: "MobileNotificationsClient", surfaceName: "mobile" });
      }
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, []);

  const onEnable = useCallback(async () => {
    setBusy(true);
    setMsg(null);
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        await Notification.requestPermission();
      }
      const ok = await registerWebPushSubscription();
      setMsg(ok ? "Push subscription saved." : "Push could not be enabled (check VAPID key and HTTPS).");
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
      <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">Push</p>
      <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">
        Set <code className="text-mca-accent/90">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> for production Web Push. Background sync prefetches
        marketplace and community shells when supported.
      </p>
      <div className="mt-mca-md flex flex-wrap gap-mca-sm">
        <Button type="button" variant="secondary" disabled={busy} onClick={() => void onEnable()}>
          {busy ? "Working…" : "Enable notifications"}
        </Button>
      </div>
      {msg ? <p className="mt-mca-sm text-mca-caption text-mca-ink-body">{msg}</p> : null}
    </Panel>
  );
}
