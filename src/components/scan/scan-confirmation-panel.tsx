"use client";

import type { NormalizedCard } from "@/lib/ai/normalize-card";
import type { RankedScanCandidate, ScanRankingResult } from "@/lib/scanning/phase3/types";
import {
  hydrateFromRankedCandidate,
  toAddCardPrefillPayload,
  toCardCreateBody,
} from "@/mca-utils/catalog/hydrateCardMetadata";
import { resolveCatalogMatchConfidence } from "@/mca-utils/catalog/confidence";
import { CardMetadataPanel } from "@/mca-ui/card-metadata-panel";
import { CardConfidenceBadge } from "@/mca-ui/card-confidence-badge";
import { CardVariantSelector } from "@/mca-ui/card-variant-selector";
import { CardScanCandidates } from "@/mca-ui/card-scan-candidates";
import { findMultiVariantGroups } from "@/lib/catalog/variants";
import type { CatalogCardHit } from "@/lib/dto/catalog";
import { Button } from "@/mca-ui/button";
import { LoadingButton } from "@/mca-ui/loading-button";
import { InlineError } from "@/mca-ui/inline-error";
import { fetchJson, fetchJsonUserFacingMessage } from "@/lib/client";
import { cn } from "@/lib/ui/cn";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

function rankedToHit(c: RankedScanCandidate): CatalogCardHit {
  return {
    id: c.catalog_card_id,
    name: c.card_name,
    set: c.set_name,
    set_id: c.set_id ?? undefined,
    number: c.number,
    rarity: c.rarity,
    image_url: c.image_url,
  };
}

export type ScanConfirmationPanelProps = {
  ranking: ScanRankingResult;
  normalized: NormalizedCard;
  scanEventId: string;
  binderId: string;
  onScanNext?: () => void;
  className?: string;
};

export function ScanConfirmationPanel({
  ranking,
  normalized,
  scanEventId,
  binderId,
  onScanNext,
  className,
}: ScanConfirmationPanelProps) {
  const initial = ranking.topCandidate;
  const [selected, setSelected] = useState<RankedScanCandidate | null>(initial);
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);

  const variantHits = useMemo(() => {
    const all = ranking.allCandidates.map(rankedToHit);
    const groups = findMultiVariantGroups(all);
    const key = selected?.catalog_card_id;
    if (!key) return [];
    const g = groups.find((grp) => grp.variants.some((h) => h.id === key));
    return g && g.variants.length >= 2 ? g.variants : [];
  }, [ranking.allCandidates, selected?.catalog_card_id]);

  const meta = selected ? hydrateFromRankedCandidate(selected) : null;
  const confidence = selected
    ? resolveCatalogMatchConfidence({
        query: normalized.name || selected.card_name,
        hit: rankedToHit(selected),
        searchMode: "name",
      })
    : null;

  const addToBinder = useCallback(async () => {
    if (!selected || !meta) return;
    setAdding(true);
    setAddErr(null);
    const body = toCardCreateBody(meta, binderId, { scan_event_id: scanEventId });
    const r = await fetchJson<{ card: { id: string } }>("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setAdding(false);
    if (r.kind !== "ok") {
      setAddErr(fetchJsonUserFacingMessage(r));
      return;
    }
    onScanNext?.();
  }, [selected, meta, binderId, scanEventId, onScanNext]);

  const prefill = meta ? toAddCardPrefillPayload(meta) : null;
  const editHref =
    prefill && binderId
      ? `/binders/${encodeURIComponent(binderId)}/add-card?${new URLSearchParams({
          ...(prefill.name ? { name: prefill.name } : {}),
          ...(prefill.number ? { number: prefill.number } : {}),
          ...(prefill.catalog_card_id ? { catalog_card_id: prefill.catalog_card_id } : {}),
          scan_event_id: scanEventId,
        })}`
      : null;

  return (
    <div className={cn("space-y-mca-md", className)}>
      {meta ? (
        <CardMetadataPanel
          title="Scan result"
          data={{
            name: meta.name,
            setName: meta.setName,
            number: meta.number,
            rarity: meta.rarity,
            imageUrl: meta.imageUrl,
            supertype: meta.supertype,
            subtypes: meta.subtypes,
          }}
        />
      ) : null}

      {confidence ? <CardConfidenceBadge band={confidence.band} /> : null}

      {variantHits.length >= 2 && selected ? (
        <CardVariantSelector
          variants={variantHits}
          value={selected.catalog_card_id}
          onChange={(hit) => {
            const match = ranking.allCandidates.find((c) => c.catalog_card_id === hit.id);
            if (match) setSelected(match);
          }}
        />
      ) : null}

      <CardScanCandidates
        topCandidate={ranking.topCandidate}
        secondaryCandidates={ranking.secondaryCandidates}
        selectedId={selected?.catalog_card_id ?? null}
        onSelect={setSelected}
      />

      {addErr ? <InlineError>{addErr}</InlineError> : null}

      <div className="flex flex-wrap gap-mca-sm">
        <LoadingButton
          type="button"
          isLoading={adding}
          disabled={!selected}
          onClick={() => void addToBinder()}
          className="inline-flex items-center justify-center rounded-mca-control border border-mca-accent-border/50 bg-mca-accent-strong/90 px-mca-comfortable py-mca-tight text-sm font-semibold text-mca-on-accent"
        >
          Add to binder
        </LoadingButton>
        {onScanNext ? (
          <Button type="button" variant="secondary" onClick={onScanNext}>
            Scan next card
          </Button>
        ) : null}
        {editHref ? (
          <Link
            href={editHref}
            className="inline-flex items-center justify-center rounded-mca-control px-mca-compact py-mca-sm text-sm font-medium text-mca-ink-muted transition duration-200 ease-mca-standard hover:text-mca-ink-strong"
          >
            Edit before add
          </Link>
        ) : null}
      </div>
    </div>
  );
}
