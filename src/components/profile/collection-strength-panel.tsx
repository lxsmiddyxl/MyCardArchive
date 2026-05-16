"use client";

import type { CollectionStrengthDTO } from "@/lib/profile/collection-strength";
import { Panel } from "@/mca-ui/panel";
import { useEffect, useState } from "react";

export function CollectionStrengthPanel({ profileId }: { profileId: string }) {
  const [strength, setStrength] = useState<CollectionStrengthDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/profile/${profileId}/collection-strength`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json() as Promise<{ strength: CollectionStrengthDTO }>;
      })
      .then((j) => {
        if (!cancelled) setStrength(j.strength);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  return (
    <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
      <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
        Collection strength
      </p>
      {error ? <p className="mt-mca-sm text-mca-caption text-mca-danger">{error}</p> : null}
      {!strength && !error ? (
        <p className="mt-mca-sm text-mca-body text-mca-ink-muted">Loading…</p>
      ) : strength ? (
        <>
          <p className="mt-mca-sm text-mca-title font-semibold text-mca-ink">{strength.label}</p>
          <p className="mt-mca-xs text-mca-caption text-mca-hint">{strength.hint}</p>
        </>
      ) : null}
    </Panel>
  );
}
