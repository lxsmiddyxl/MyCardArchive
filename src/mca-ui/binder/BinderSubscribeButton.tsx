"use client";

import { extractApiErrorMessage, extractApiPayload } from "@/lib/client";
import { Button } from "@/mca-ui/button";
import { useCallback, useState } from "react";

export type BinderSubscribeButtonProps = {
  binderId: string;
  initialSubscribed: boolean;
  canSubscribe?: boolean;
  onChange?: (subscribed: boolean) => void;
};

export function BinderSubscribeButton({
  binderId,
  initialSubscribed,
  canSubscribe = true,
  onChange,
}: BinderSubscribeButtonProps) {
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback(async () => {
    if (!canSubscribe || busy) return;
    setBusy(true);
    setError(null);
    const path = subscribed ? "unsubscribe" : "subscribe";
    try {
      const res = await fetch(`/api/binders/${encodeURIComponent(binderId)}/${path}`, {
        method: "POST",
      });
      const raw = await res.json().catch(() => ({}));
      const payload = extractApiPayload(raw);
      if (!res.ok) {
        setError(extractApiErrorMessage(payload) ?? "Could not update subscription");
        return;
      }
      const next = !subscribed;
      setSubscribed(next);
      onChange?.(next);
    } finally {
      setBusy(false);
    }
  }, [binderId, busy, canSubscribe, onChange, subscribed]);

  if (!canSubscribe) return null;

  return (
    <div className="space-y-mca-xs">
      <Button
        type="button"
        variant={subscribed ? "secondary" : "primary"}
        disabled={busy}
        onClick={() => void toggle()}
      >
        {subscribed ? "Subscribed" : "Subscribe"}
      </Button>
      {error ? <p className="text-xs text-mca-error-text">{error}</p> : null}
    </div>
  );
}
