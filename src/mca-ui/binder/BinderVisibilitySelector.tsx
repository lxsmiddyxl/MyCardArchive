"use client";

import {
  BINDER_VISIBILITY_LABELS,
  type BinderVisibility,
} from "@/lib/binders/binder-social-types";
import { extractApiErrorMessage, extractApiPayload } from "@/lib/client";
import { cn } from "@/lib/ui/cn";
import { Button } from "@/mca-ui/button";
import { InlineError } from "@/mca-ui/inline-error";
import { useCallback, useState } from "react";

export type BinderVisibilitySelectorProps = {
  binderId: string;
  initialVisibility: BinderVisibility;
  className?: string;
};

const MODES: BinderVisibility[] = ["private", "unlisted", "public"];

export function BinderVisibilitySelector({
  binderId,
  initialVisibility,
  className,
}: BinderVisibilitySelectorProps) {
  const [visibility, setVisibility] = useState<BinderVisibility>(initialVisibility);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(
    initialVisibility !== "private" ? `/b/${binderId}` : null
  );

  const save = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/binders/${encodeURIComponent(binderId)}/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility }),
      });
      const raw = await res.json().catch(() => ({}));
      const payload = extractApiPayload(raw);
      if (!res.ok) {
        setError(extractApiErrorMessage(payload) ?? "Could not update visibility");
        return;
      }
      const url = (payload as { share_url?: string }).share_url;
      setShareUrl(url ?? (visibility !== "private" ? `/b/${binderId}` : null));
    } catch {
      setError("Could not update visibility");
    } finally {
      setBusy(false);
    }
  }, [binderId, visibility]);

  return (
    <div
      className={cn(
        "space-y-mca-md rounded-mca-card border border-mca-border-subtle/80 bg-mca-surface/40 p-mca-compact",
        className
      )}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Sharing
        </p>
        <p className="mt-mca-xs text-sm text-mca-ink-muted">
          Private binders are only visible to you. Unlisted binders use a share link. Public
          binders appear in Explore.
        </p>
      </div>
      <div className="flex flex-wrap gap-mca-xs">
        {MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            disabled={busy}
            onClick={() => setVisibility(mode)}
            className={cn(
              "rounded-mca-pill border px-mca-sm py-mca-tight text-xs font-medium transition duration-200 ease-mca-standard",
              visibility === mode
                ? "border-mca-accent-border/50 bg-mca-accent-border/15 text-mca-accent"
                : "border-mca-border-subtle text-mca-ink-muted hover:bg-mca-chrome/50"
            )}
          >
            {BINDER_VISIBILITY_LABELS[mode]}
          </button>
        ))}
      </div>
      {shareUrl ? (
        <p className="text-xs text-mca-ink-muted">
          Share link:{" "}
          <a href={shareUrl} className="font-medium text-mca-accent-strong/90 hover:underline">
            {shareUrl}
          </a>
        </p>
      ) : null}
      {error ? <InlineError>{error}</InlineError> : null}
      <Button type="button" variant="secondary" disabled={busy} onClick={() => void save()}>
        Save visibility
      </Button>
    </div>
  );
}
