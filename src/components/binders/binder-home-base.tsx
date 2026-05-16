"use client";

import { resolveBinderAccent } from "@/lib/binders/binder-accent";
import { extractApiErrorMessage, extractApiPayload } from "@/lib/client";
import { BinderDistributionPanel } from "@/mca-ui/binder/BinderDistributionPanel";
import { BinderOverviewPanel } from "@/mca-ui/binder/BinderOverviewPanel";
import { BinderSetProgressList } from "@/mca-ui/binder/BinderSetProgressList";
import { InlineError } from "@/mca-ui/inline-error";
import type { BinderInsights } from "@/mca-utils/binders/binder-insights-types";
import { useCallback, useEffect, useState } from "react";

export type BinderHomeBaseProps = {
  binderId: string;
};

export function BinderHomeBase({ binderId }: BinderHomeBaseProps) {
  const [insights, setInsights] = useState<BinderInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/binders/${encodeURIComponent(binderId)}/insights`, {
        cache: "no-store",
      });
      const raw = await res.json().catch(() => ({}));
      const payload = extractApiPayload(raw);
      if (!res.ok) {
        setError(extractApiErrorMessage(payload) ?? "Could not load binder insights.");
        setInsights(null);
        return;
      }
      setInsights(payload as unknown as BinderInsights);
    } catch {
      setError("Could not load binder insights.");
      setInsights(null);
    } finally {
      setLoading(false);
    }
  }, [binderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const accent = resolveBinderAccent(binderId);

  if (error) {
    return <InlineError>{error}</InlineError>;
  }

  const overview = insights?.overview ?? {
    binder_id: binderId,
    name: "Binder",
    description: null,
    created_at: new Date(0).toISOString(),
    updated_at: null,
    total_cards: 0,
    unique_catalog_cards: 0,
    sets_represented: 0,
  };

  return (
    <div className="space-y-mca-section">
      <BinderOverviewPanel overview={overview} accent={accent} />
      <BinderDistributionPanel
        rarity_distribution={insights?.rarity_distribution ?? {
          common: 0,
          uncommon: 0,
          rare: 0,
          ultra: 0,
          secret: 0,
          other: 0,
        }}
        variant_distribution={insights?.variant_distribution ?? {
          standard: 0,
          holo: 0,
          reverse: 0,
          promo: 0,
          alt_art: 0,
          other: 0,
        }}
        duplicate_count={insights?.duplicate_count ?? 0}
        total_variants={insights?.total_variants ?? 0}
        accent={accent}
        loading={loading}
      />
      <BinderSetProgressList
        binderId={binderId}
        sets={insights?.sets ?? []}
        accent={accent}
        loading={loading}
      />
    </div>
  );
}
