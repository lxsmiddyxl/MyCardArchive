"use client";

import { useEffect, useState } from "react";

export function OfferExpiryCountdown({ expiresAt }: { expiresAt: string | null | undefined }) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      setLeft(null);
      return;
    }
    const end = new Date(expiresAt).getTime();
    if (Number.isNaN(end)) {
      setLeft(null);
      return;
    }
    const tick = () => {
      const ms = end - Date.now();
      setLeft(ms <= 0 ? 0 : ms);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  if (!expiresAt || left === null) return null;
  if (left <= 0) {
    return (
      <p className="text-mca-caption font-medium text-mca-warning-tint" role="status">
        Offer window expired (non-binding).
      </p>
    );
  }
  const s = Math.floor(left / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const label = h > 0 ? `${h}h ${m}m ${sec}s` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  return (
    <p className="text-mca-caption text-mca-ink-muted" role="timer" aria-live="polite">
      Expires in <span className="font-mono font-semibold text-mca-ink-body">{label}</span>
    </p>
  );
}
