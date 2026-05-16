"use client";

import { extractApiPayload } from "@/lib/client";
import { Panel } from "@/mca-ui/panel";
import { useCallback, useEffect, useState } from "react";

const EMOJIS = ["👍", "❤️", "🔥", "🎉", "🎴", "✨"];

export type BinderReactionsProps = {
  binderId: string;
  canReact?: boolean;
};

export function BinderReactions({ binderId, canReact = true }: BinderReactionsProps) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/binders/${encodeURIComponent(binderId)}/reactions`, {
      cache: "no-store",
    });
    const raw = await res.json().catch(() => ({}));
    const payload = extractApiPayload(raw);
    if (!res.ok) return;
    setCounts((payload as { counts?: Record<string, number> }).counts ?? {});
    setMine(new Set((payload as { viewerReactions?: string[] }).viewerReactions ?? []));
  }, [binderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = useCallback(
    async (emoji: string) => {
      if (!canReact || busy) return;
      setBusy(true);
      try {
        await fetch(`/api/binders/${encodeURIComponent(binderId)}/react`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji }),
        });
        await load();
      } finally {
        setBusy(false);
      }
    },
    [binderId, busy, canReact, load]
  );

  return (
    <Panel className="space-y-mca-sm">
      <h3 className="text-sm font-semibold text-mca-ink-body">Reactions</h3>
      <div className="flex flex-wrap gap-mca-xs">
        {EMOJIS.map((emoji) => {
          const active = mine.has(emoji);
          const count = counts[emoji] ?? 0;
          return (
            <button
              key={emoji}
              type="button"
              disabled={!canReact || busy}
              onClick={() => void toggle(emoji)}
              className={`inline-flex items-center gap-mca-trace rounded-mca-pill border px-mca-sm py-mca-tight text-sm transition duration-200 ease-mca-standard ${
                active
                  ? "border-mca-accent-border/50 bg-mca-accent-border/15"
                  : "border-mca-border-subtle bg-mca-chrome/40"
              }`}
            >
              <span>{emoji}</span>
              {count > 0 ? <span className="text-xs tabular-nums text-mca-ink-muted">{count}</span> : null}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
