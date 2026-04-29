"use client";

import type { InventoryCardItem } from "@/components/cards/inventory-types";
import { Field } from "@/mca-ui/field";
import { McaIcons } from "@/lib/icons/mca-icons";
import { Icon } from "@/mca-ui/icon";
import { InlineError } from "@/mca-ui/inline-error";
import { LoadingSpinner } from "@/mca-ui/loading-button";
import { Panel } from "@/mca-ui/panel";
import { useCallback, useMemo } from "@/lib/perf/memo";
import { useDebouncedValue } from "@/lib/perf/use-debounced-value";
import dynamic from "next/dynamic";
import { lazy, Suspense, useEffect, useState } from "react";

const SEARCH_DEBOUNCE_MS = 260;

const CardDetailModal = dynamic(
  () =>
    import("./card-detail-modal").then((m) => ({ default: m.CardDetailModal })),
  { loading: () => null, ssr: false }
);

const InventoryListSectionLazy = lazy(() => import("@/components/cards/inventory-list-section"));

function useGridColumns(): number {
  const [cols, setCols] = useState(3);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setCols(1);
      else if (w < 1024) setCols(2);
      else setCols(3);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return cols;
}

export type SortKey = "recent" | "name_asc" | "name_desc" | "binder_asc" | "set_asc";

function sortCards(items: InventoryCardItem[], sort: SortKey): InventoryCardItem[] {
  const copy = [...items];
  switch (sort) {
    case "recent":
      return copy.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    case "name_asc":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "name_desc":
      return copy.sort((a, b) => b.name.localeCompare(a.name));
    case "binder_asc":
      return copy.sort((a, b) =>
        (a.binder_name ?? a.binder_id).localeCompare(b.binder_name ?? b.binder_id)
      );
    case "set_asc":
      return copy.sort((a, b) => (a.set ?? "").localeCompare(b.set ?? ""));
    default:
      return copy;
  }
}

export function CardsInventoryClient() {
  const [cards, setCards] = useState<InventoryCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const [setFilter, setSetFilter] = useState("all");
  const [binderFilter, setBinderFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("recent");

  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const cols = useGridColumns();

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const cardsRes = await fetch("/api/cards/list", { cache: "no-store" });
      if (!cardsRes.ok) {
        const body = (await cardsRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to load cards");
      }
      const cardsBody = (await cardsRes.json()) as { cards?: InventoryCardItem[] };
      setCards(Array.isArray(cardsBody.cards) ? cardsBody.cards : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load inventory");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const binderOptions = useMemo(() => {
    const m = new Map<string, string>();
    cards.forEach((c) => {
      m.set(c.binder_id, c.binder_name ?? c.binder_id);
    });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [cards]);

  const setOptions = useMemo(() => {
    return Array.from(new Set(cards.map((c) => c.set).filter((v): v is string => Boolean(v)))).sort(
      (a, b) => a.localeCompare(b)
    );
  }, [cards]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return cards.filter((card) => {
      if (q.length > 0 && !card.name.toLowerCase().includes(q)) return false;
      if (setFilter !== "all" && card.set !== setFilter) return false;
      if (binderFilter !== "all" && card.binder_id !== binderFilter) return false;
      return true;
    });
  }, [cards, debouncedSearch, setFilter, binderFilter]);

  const sortedFiltered = useMemo(
    () => sortCards(filtered, sortKey),
    [filtered, sortKey]
  );

  const filterSignature = useMemo(
    () => `${debouncedSearch}|${setFilter}|${binderFilter}|${sortKey}`,
    [debouncedSearch, setFilter, binderFilter, sortKey]
  );

  const listBusy = loading || refreshing;

  const onOpenDetail = useCallback((id: string) => {
    setDetailCardId(id);
  }, []);

  const closeDetail = useCallback(() => setDetailCardId(null), []);

  return (
    <>
      <Panel elevated className="border-mca-border bg-mca-surface/40 p-mca-md shadow-mca-card">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Global inventory
        </p>
        <p className="mt-mca-sm max-w-2xl text-mca-body text-mca-ink-muted">
          Read-only view of every Pokémon card in your binders. Add cards, uploads, and moves happen
          inside each binder so tier limits stay enforced there.
        </p>
      </Panel>

      <div className="grid gap-mca-md lg:grid-cols-[1fr_280px]">
        <Field id="card-search" label="Search by name" hint="Matches card title only.">
          <input
            id="card-search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="e.g. Charizard"
            disabled={listBusy}
            className="mca-input mt-0 w-full rounded-mca-card border-mca-border-subtle bg-mca-surface-elevated text-mca-body text-white placeholder:text-mca-ink-subtle disabled:opacity-60"
          />
        </Field>
        <Field id="card-sort" label="Sort">
          <select
            id="card-sort"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            disabled={listBusy}
            className="mca-input mt-0 w-full rounded-mca-card border-mca-border-subtle bg-mca-surface-elevated text-mca-body text-white disabled:opacity-60"
          >
            <option value="recent">Recently added</option>
            <option value="name_asc">Name (A–Z)</option>
            <option value="name_desc">Name (Z–A)</option>
            <option value="binder_asc">Binder (A–Z)</option>
            <option value="set_asc">Set (A–Z)</option>
          </select>
        </Field>
      </div>

      <div className="grid gap-mca-md sm:grid-cols-2">
        <Field id="filter-set" label="Set">
          <select
            id="filter-set"
            value={setFilter}
            onChange={(e) => setSetFilter(e.target.value)}
            disabled={listBusy}
            className="mca-input mt-0 w-full rounded-mca-card border-mca-border-subtle bg-mca-surface-elevated text-mca-body text-white disabled:opacity-60"
          >
            <option value="all">All sets</option>
            {setOptions.map((setName) => (
              <option key={setName} value={setName}>
                {setName}
              </option>
            ))}
          </select>
        </Field>
        <Field id="filter-binder" label="Binder">
          <select
            id="filter-binder"
            value={binderFilter}
            onChange={(e) => setBinderFilter(e.target.value)}
            disabled={listBusy}
            className="mca-input mt-0 w-full rounded-mca-card border-mca-border-subtle bg-mca-surface-elevated text-mca-body text-white disabled:opacity-60"
          >
            <option value="all">All binders</option>
            {binderOptions.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {error ? <InlineError>{error}</InlineError> : null}

      {loading ? (
        <div className="flex items-center gap-mca-md rounded-mca-card border border-mca-border bg-mca-surface-elevated/95 px-mca-md py-mca-lg text-mca-body text-mca-ink-muted shadow-mca-panel dark:border-mca-border-subtle">
          <LoadingSpinner className="size-5 text-mca-accent/90" />
          Loading your collection…
        </div>
      ) : refreshing ? (
        <div className="flex items-center gap-mca-sm rounded-mca-card border border-mca-border/80 bg-mca-surface-elevated/40 px-mca-md py-mca-sm text-mca-caption text-mca-ink-subtle">
          <LoadingSpinner className="size-4 text-mca-accent/80" />
          Refreshing…
        </div>
      ) : null}

      {!loading && sortedFiltered.length === 0 ? (
        <div className="flex flex-col items-center gap-mca-md rounded-mca-card border border-mca-border bg-mca-surface-elevated/95 p-mca-lg text-mca-body text-mca-ink-muted shadow-mca-panel dark:border-mca-border-subtle">
          <Icon src={McaIcons.system.info} size="lg" alt="" />
          <p className="text-center">No cards match your search and filters.</p>
        </div>
      ) : null}

      {!loading && sortedFiltered.length > 0 ? (
        <div
          key={filterSignature}
          className={`relative transition-opacity duration-200 ease-mca-standard ${refreshing ? "pointer-events-none opacity-60" : ""}`}
        >
          {refreshing ? (
            <div
              className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center pt-mca-xl"
              aria-hidden
            >
              <div className="flex items-center gap-mca-sm rounded-mca-block border border-mca-border bg-mca-surface-elevated/95 px-mca-md py-mca-sm text-mca-caption text-mca-ink-body shadow-mca-card shadow-black/30 dark:border-mca-border-subtle">
                <LoadingSpinner className="size-4 text-mca-accent" />
                Refreshing…
              </div>
            </div>
          ) : null}
          <Suspense
            fallback={
              <Panel className="flex min-h-[12rem] items-center justify-center border-mca-border bg-mca-surface-elevated/50">
                <LoadingSpinner className="size-8 text-mca-accent/90" />
              </Panel>
            }
          >
            <InventoryListSectionLazy
              items={sortedFiltered}
              cols={cols}
              listBusy={listBusy}
              onOpenDetail={onOpenDetail}
            />
          </Suspense>
        </div>
      ) : null}

      <CardDetailModal
        open={Boolean(detailCardId)}
        cardId={detailCardId}
        onClose={closeDetail}
        readOnly
      />
    </>
  );
}
