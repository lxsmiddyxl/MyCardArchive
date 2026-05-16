"use client";

import { extractApiErrorMessage, extractApiPayload } from "@/lib/client";
import { cn } from "@/lib/ui/cn";
import { Field } from "@/mca-ui/field";
import { InlineError } from "@/mca-ui/inline-error";
import { Panel } from "@/mca-ui/panel";
import type {
  BinderMissingBySet,
  BinderMissingResult,
  MissingCardsSort,
} from "@/mca-utils/binders/binder-insights-types";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const SORT_OPTIONS: { value: MissingCardsSort; label: string }[] = [
  { value: "number", label: "Number" },
  { value: "rarity", label: "Rarity" },
  { value: "name", label: "Name" },
];

export type BinderMissingClientProps = {
  binderId: string;
  initialSetId?: string;
};

export function BinderMissingClient({ binderId, initialSetId }: BinderMissingClientProps) {
  const [sort, setSort] = useState<MissingCardsSort>("number");
  const [setId, setSetId] = useState(initialSetId ?? "");
  const [data, setData] = useState<BinderMissingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ sort });
    if (setId.trim()) params.set("setId", setId.trim());
    try {
      const res = await fetch(
        `/api/binders/${encodeURIComponent(binderId)}/missing?${params.toString()}`,
        { cache: "no-store" }
      );
      const raw = await res.json().catch(() => ({}));
      const payload = extractApiPayload(raw);
      if (!res.ok) {
        setError(extractApiErrorMessage(payload) ?? "Could not load missing cards.");
        setData(null);
        return;
      }
      setData(payload as unknown as BinderMissingResult);
    } catch {
      setError("Could not load missing cards.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [binderId, setId, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const sets = data?.sets ?? [];
  const totalMissing = sets.reduce((n, s) => n + s.missing.length, 0);

  return (
    <div className="space-y-mca-lg">
      <div className="flex flex-col gap-mca-md sm:flex-row sm:items-end sm:justify-between">
        <Field id="missing-sort" label="Sort missing cards">
          <select
            id="missing-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as MissingCardsSort)}
            className="w-full max-w-xs rounded-mca-control border border-mca-field-border bg-mca-surface px-mca-sm py-mca-tight text-sm text-mca-ink-body"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        {setId ? (
          <Link
            href={`/binders/${encodeURIComponent(binderId)}/missing`}
            className="text-sm font-medium text-mca-accent-strong/90 hover:text-mca-accent"
          >
            Show all sets
          </Link>
        ) : null}
      </div>

      {error ? <InlineError>{error}</InlineError> : null}
      {loading ? (
        <p className="text-sm text-mca-ink-muted">Loading missing cards…</p>
      ) : null}
      {!loading && !error && totalMissing === 0 ? (
        <Panel className="text-center text-sm text-mca-ink-muted">
          No missing catalog cards for the sets in this binder.
        </Panel>
      ) : null}

      {!loading && !error
        ? sets.map((setBlock) => (
            <MissingSetBlock key={setBlock.set_id} binderId={binderId} setBlock={setBlock} />
          ))
        : null}
    </div>
  );
}

function MissingSetBlock({
  binderId,
  setBlock,
}: {
  binderId: string;
  setBlock: BinderMissingBySet;
}) {
  if (setBlock.missing.length === 0) return null;

  return (
    <section className="space-y-mca-md" aria-labelledby={`missing-set-${setBlock.set_id}`}>
      <div className="flex items-center gap-mca-sm">
        {setBlock.symbol_url || setBlock.logo_url ? (
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-mca-control bg-mca-chrome/50">
            <Image
              src={(setBlock.symbol_url ?? setBlock.logo_url)!}
              alt=""
              width={32}
              height={32}
              className="object-contain p-mca-trace"
              unoptimized
            />
          </div>
        ) : null}
        <h2
          id={`missing-set-${setBlock.set_id}`}
          className="text-lg font-semibold text-mca-ink-strong"
        >
          {setBlock.set_name}
          <span className="ml-mca-sm text-sm font-normal text-mca-ink-muted">
            ({setBlock.missing.length} missing)
          </span>
        </h2>
      </div>

      <ul className="grid gap-mca-sm sm:grid-cols-2 lg:grid-cols-3">
        {setBlock.missing.map((card) => {
          const addHref = `/binders/${encodeURIComponent(binderId)}/add-card?catalog_card_id=${encodeURIComponent(card.catalog_card_id)}`;
          const scanHref = `/scan`;
          return (
            <li key={card.catalog_card_id}>
              <Panel className="flex gap-mca-sm p-mca-sm">
                <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-mca-control bg-mca-chrome/40">
                  {card.image_small ? (
                    <Image
                      src={card.image_small}
                      alt=""
                      width={56}
                      height={80}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-mca-caption text-mca-ink-subtle">
                      —
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-mca-xs">
                  <p className="truncate text-sm font-medium text-mca-ink-body">{card.name}</p>
                  <p className="text-xs text-mca-ink-muted">
                    #{card.number}
                    {card.rarity ? ` · ${card.rarity}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-mca-xs pt-mca-xs">
                    <Link
                      href={addHref}
                      className={cn(
                        "inline-flex min-h-[2rem] items-center rounded-mca-control border border-mca-field-border bg-mca-chrome px-mca-sm text-xs font-semibold text-mca-ink-strong transition duration-200 ease-mca-standard hover:bg-mca-border-subtle"
                      )}
                    >
                      Add manually
                    </Link>
                    <Link
                      href={scanHref}
                      className={cn(
                        "inline-flex min-h-[2rem] items-center rounded-mca-control border border-transparent px-mca-sm text-xs font-semibold text-mca-accent-strong/90 transition duration-200 ease-mca-standard hover:text-mca-accent"
                      )}
                    >
                      Scan for this card
                    </Link>
                  </div>
                </div>
              </Panel>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
