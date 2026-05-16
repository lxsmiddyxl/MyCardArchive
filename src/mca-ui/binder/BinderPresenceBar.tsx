"use client";

import { extractApiPayload } from "@/lib/client";
import { cn } from "@/lib/ui/cn";
import { useCallback, useEffect, useState } from "react";

type Viewer = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  mode: string;
};

export type BinderPresenceBarProps = {
  binderId: string;
  mode?: "viewing" | "editing" | "scanning" | "adding";
  enabled?: boolean;
  className?: string;
};

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "MC";
}

export function BinderPresenceBar({
  binderId,
  mode = "viewing",
  enabled = true,
  className,
}: BinderPresenceBarProps) {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [visible, setVisible] = useState(false);

  const ping = useCallback(async () => {
    if (!enabled) return;
    await fetch("/api/presence/ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ binderId, mode }),
    });
  }, [binderId, enabled, mode]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/presence/binder/${encodeURIComponent(binderId)}`, {
      cache: "no-store",
    });
    const raw = await res.json().catch(() => ({}));
    const payload = extractApiPayload(raw);
    if (!res.ok) return;
    const list = (payload as { viewers?: Viewer[] }).viewers ?? [];
    setViewers(list);
    setVisible(list.length > 0);
  }, [binderId]);

  useEffect(() => {
    void ping();
    void load();
    const pingTimer = window.setInterval(() => void ping(), 25_000);
    const loadTimer = window.setInterval(() => void load(), 12_000);
    return () => {
      window.clearInterval(pingTimer);
      window.clearInterval(loadTimer);
    };
  }, [load, ping]);

  if (!visible && viewers.length === 0) return null;

  const label =
    viewers.length === 1
      ? "1 collector here"
      : `${viewers.length} collectors here`;

  return (
    <div
      className={cn(
        "flex items-center gap-mca-sm rounded-mca-pill border border-mca-border-subtle/80 bg-mca-chrome/40 px-mca-sm py-mca-tight text-xs text-mca-ink-muted transition-opacity duration-200 ease-mca-standard",
        visible ? "opacity-100" : "opacity-70",
        className
      )}
    >
      <div className="flex -space-x-2">
        {viewers.slice(0, 4).map((v) => (
          <span
            key={v.userId}
            title={v.displayName}
            className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-mca-surface bg-mca-accent-border/20 text-[10px] font-semibold text-mca-ink-body"
          >
            {v.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(v.displayName)
            )}
          </span>
        ))}
      </div>
      <span>{label}</span>
    </div>
  );
}
