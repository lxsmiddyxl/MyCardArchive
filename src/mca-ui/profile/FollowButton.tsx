"use client";

import { extractApiErrorMessage, extractApiPayload } from "@/lib/client";
import { Button } from "@/mca-ui/button";
import { useCallback, useState } from "react";

export type FollowButtonProps = {
  username: string;
  initialFollowing: boolean;
  disabled?: boolean;
  onChange?: (following: boolean) => void;
};

export function FollowButton({
  username,
  initialFollowing,
  disabled,
  onChange,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback(async () => {
    if (disabled || busy) return;
    setBusy(true);
    setError(null);
    const path = following ? "unfollow" : "follow";
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/${path}`, {
        method: "POST",
      });
      const raw = await res.json().catch(() => ({}));
      const payload = extractApiPayload(raw);
      if (!res.ok) {
        setError(extractApiErrorMessage(payload) ?? "Could not update follow");
        return;
      }
      const next = !following;
      setFollowing(next);
      onChange?.(next);
    } finally {
      setBusy(false);
    }
  }, [busy, disabled, following, onChange, username]);

  return (
    <div className="space-y-mca-xs">
      <Button
        type="button"
        variant={following ? "secondary" : "primary"}
        disabled={disabled || busy}
        onClick={() => void toggle()}
      >
        {following ? "Following" : "Follow"}
      </Button>
      {error ? <p className="text-xs text-mca-error-text">{error}</p> : null}
    </div>
  );
}
