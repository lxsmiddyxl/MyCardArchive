"use client";

import { fetchJson, fetchJsonErrorMessage, useAsyncState } from "@/lib/client";
import type { DeckAddCardResponseDTO } from "@/lib/dto/deck-import";
import { McaVirtualList } from "@/components/ui/mca-virtual-list";
import { RemoteCardThumb } from "@/mca-ui/remote-card-thumb";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  hoverPreviewHandlers,
  useCardHoverPreview,
  type CardHoverPreviewApi,
} from "./card-hover-preview";

export type SearchCardRow = {
  id: string;
  name: string;
  rarity: string | null;
  image_url: string | null;
  catalog_cards: {
    id: string;
    name: string;
    rarity: string | null;
    supertype: string | null;
    image_small: string | null;
    image_large: string | null;
    set_id: string;
    catalog_sets: { id: string; name: string } | { id: string; name: string }[] | null;
  } | null;
};

function setNameFromEmbed(
  embed: SearchCardRow["catalog_cards"]
): string {
  if (!embed) return "—";
  const cs = embed.catalog_sets;
  if (Array.isArray(cs)) {
    return cs[0]?.name ?? embed.set_id;
  }
  return cs?.name ?? embed.set_id;
}

type DeckSearchCardRowProps = {
  row: SearchCardRow;
  preview: CardHoverPreviewApi;
  addingId: string | null;
  onAdd: (cardId: string) => void;
};

const DeckSearchCardRow = memo(function DeckSearchCardRow({
  row,
  preview,
  addingId,
  onAdd,
}: DeckSearchCardRowProps) {
  const thumb =
    row.catalog_cards?.image_small ??
    row.image_url ??
    row.catalog_cards?.image_large ??
    "";
  const large =
    row.catalog_cards?.image_large ??
    row.catalog_cards?.image_small ??
    row.image_url ??
    "";

  const handlers = useMemo(
    () => hoverPreviewHandlers(preview, large || thumb || null),
    [preview, large, thumb]
  );

  return (
    <div role="listitem">
      <button
        type="button"
        disabled={addingId === row.id}
        onClick={() => void onAdd(row.id)}
        className="flex w-full items-center gap-mca-compact rounded-mca-block border border-transparent p-mca-sm text-left transition-all duration-200 ease-mca-standard hover:border-mca-border-subtle hover:bg-mca-chrome/40 hover:shadow-mca-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-50"
        {...handlers}
      >
        <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-mca-control bg-mca-chrome">
          {thumb ? (
            <RemoteCardThumb
              src={thumb}
              alt=""
              sizes="40px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-[10px] text-mca-hint">
              —
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-mca-ink-strong">
            {row.name}
          </p>
          <p className="truncate text-xs text-mca-ink-subtle">
            {setNameFromEmbed(row.catalog_cards)} ·{" "}
            {row.catalog_cards?.rarity ?? row.rarity ?? "—"}
          </p>
        </div>
      </button>
    </div>
  );
});

type DeckFilter = "all" | "in_deck" | "not_in_deck";

type Props = {
  deckId: string;
  deckCardIds: Set<string>;
  onDeckUpdated: () => void;
  className?: string;
};

const SELECT = `
  id,
  name,
  rarity,
  image_url,
  catalog_cards (
    id,
    name,
    rarity,
    supertype,
    image_small,
    image_large,
    set_id,
    catalog_sets ( id, name )
  )
`;

export function CardSearchPanel({
  deckId,
  deckCardIds,
  onDeckUpdated,
  className,
}: Props) {
  const preview = useCardHoverPreview();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const {
    run: runSearch,
    data: searchData,
    loading: searchLoading,
    error: searchError,
  } = useAsyncState<SearchCardRow[]>();
  const { run: runAdd, error: addError } = useAsyncState<unknown>();
  const [setFilter, setSetFilter] = useState("");
  const [rarityFilter, setRarityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [deckFilter, setDeckFilter] = useState<DeckFilter>("all");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [sets, setSets] = useState<{ id: string; name: string }[]>([]);

  const rows = useMemo(() => searchData ?? [], [searchData]);
  const loading = searchLoading || (searchData === null && !searchError);
  const surfaceError = searchError ?? addError;

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 320);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const supabase = supabaseBrowser();
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      const { data } = await supabase
        .from("cards")
        .select(
          `catalog_cards ( set_id, catalog_sets ( id, name ) )`
        )
        .eq("user_id", uid)
        .not("catalog_card_id", "is", null)
        .limit(800);
      if (cancelled || !data) return;
      const map = new Map<string, string>();
      for (const row of data) {
        const cc = row.catalog_cards as {
          set_id?: string;
          catalog_sets?: { id: string; name: string } | null;
        } | null;
        if (!cc?.set_id) continue;
        const name =
          cc.catalog_sets &&
          typeof cc.catalog_sets === "object" &&
          !Array.isArray(cc.catalog_sets)
            ? cc.catalog_sets.name
            : cc.set_id;
        map.set(cc.set_id, name);
      }
      setSets(
        Array.from(map.entries())
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const executeSearch = useCallback(async () => {
    await runSearch(async () => {
      const supabase = supabaseBrowser();
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        throw new Error("Not signed in.");
      }

      const safeLike = debounced.replace(/[%_]/g, "");

      let res =
        debounced.length > 0
          ? await supabase
              .from("cards")
              .select(SELECT)
              .eq("user_id", uid)
              .textSearch("name_tsv", debounced, {
                type: "websearch",
                config: "english",
              })
              .limit(80)
          : await supabase
              .from("cards")
              .select(SELECT)
              .eq("user_id", uid)
              .order("created_at", { ascending: false })
              .limit(48);

      if (
        res.error &&
        (res.error.message.includes("name_tsv") ||
          res.error.message.includes("does not exist"))
      ) {
        res = await supabase
          .from("cards")
          .select(SELECT)
          .eq("user_id", uid)
          .ilike("name", `%${safeLike}%`)
          .limit(80);
      }

      if (res.error) {
        throw new Error(res.error.message);
      }

      let list = (res.data ?? []) as unknown as SearchCardRow[];

      if (setFilter) {
        list = list.filter((r) => r.catalog_cards?.set_id === setFilter);
      }
      if (rarityFilter) {
        list = list.filter(
          (r) =>
            (r.rarity ?? r.catalog_cards?.rarity ?? "").toLowerCase() ===
            rarityFilter.toLowerCase()
        );
      }
      if (typeFilter) {
        list = list.filter(
          (r) =>
            (r.catalog_cards?.supertype ?? "").toLowerCase() ===
            typeFilter.toLowerCase()
        );
      }
      if (deckFilter === "in_deck") {
        list = list.filter((r) => deckCardIds.has(r.id));
      } else if (deckFilter === "not_in_deck") {
        list = list.filter((r) => !deckCardIds.has(r.id));
      }

      return list;
    });
  }, [
    debounced,
    deckCardIds,
    deckFilter,
    rarityFilter,
    runSearch,
    setFilter,
    typeFilter,
  ]);

  useEffect(() => {
    void executeSearch();
  }, [executeSearch]);

  const rarities = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      const v = r.rarity ?? r.catalog_cards?.rarity;
      if (v) s.add(v);
    }
    return Array.from(s).sort();
  }, [rows]);

  const types = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      const v = r.catalog_cards?.supertype;
      if (v) s.add(v);
    }
    return Array.from(s).sort();
  }, [rows]);

  const addToDeck = useCallback(
    async (cardId: string) => {
      setAddingId(cardId);
      try {
        await runAdd(async () => {
          const r = await fetchJson<DeckAddCardResponseDTO>("/api/decks/add-card", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              deck_id: deckId,
              card_id: cardId,
              quantity: 1,
              section: "main",
            }),
          });
          if (r.kind !== "ok") {
            throw new Error(fetchJsonErrorMessage(r));
          }
          onDeckUpdated();
        });
      } finally {
        setAddingId(null);
      }
    },
    [deckId, onDeckUpdated, runAdd]
  );

  return (
    <aside
      className={`flex flex-col rounded-mca-block border border-mca-border bg-mca-surface-elevated/95 shadow-mca-panel dark:border-mca-border-subtle ${className ?? ""}`}
    >
      <div className="border-b border-mca-border p-mca-base dark:border-mca-border-subtle">
        <h2 className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Card search
        </h2>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your collection…"
          className="mca-input mt-mca-compact rounded-mca-control placeholder:text-mca-ink-subtle"
        />
        <div className="mt-mca-base grid gap-mca-compact sm:grid-cols-2">
          <label className="block text-xs font-medium uppercase tracking-wide text-mca-ink-subtle">
            Set
            <select
              value={setFilter}
              onChange={(e) => setSetFilter(e.target.value)}
              className="mca-input mt-mca-micro rounded-mca-control px-mca-sm py-mca-micro text-xs text-mca-ink-soft"
            >
              <option value="">All sets</option>
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium uppercase tracking-wide text-mca-ink-subtle">
            Rarity
            <select
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value)}
              className="mca-input mt-mca-micro rounded-mca-control px-mca-sm py-mca-micro text-xs text-mca-ink-soft"
            >
              <option value="">All</option>
              {rarities.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium uppercase tracking-wide text-mca-ink-subtle">
            Type
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="mca-input mt-mca-micro rounded-mca-control px-mca-sm py-mca-micro text-xs text-mca-ink-soft"
            >
              <option value="">All</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium uppercase tracking-wide text-mca-ink-subtle">
            Deck
            <select
              value={deckFilter}
              onChange={(e) =>
                setDeckFilter(e.target.value as DeckFilter)
              }
              className="mca-input mt-mca-micro rounded-mca-control px-mca-sm py-mca-micro text-xs text-mca-ink-soft"
            >
              <option value="all">All owned</option>
              <option value="in_deck">In this deck</option>
              <option value="not_in_deck">Not in deck</option>
            </select>
          </label>
        </div>
      </div>

      <section
        className="min-h-0 flex-1 overflow-y-auto p-mca-compact"
        aria-live="polite"
        aria-busy={loading || Boolean(addingId)}
      >
        <span className="sr-only" aria-live="polite">
          {loading
            ? "Searching collection."
            : rows.length > 0
              ? `${rows.length} result${rows.length === 1 ? "" : "s"}.`
              : ""}
        </span>
        {surfaceError ? (
          <p
            className="rounded-mca-block border border-mca-border px-mca-compact py-mca-sm text-mca-caption text-mca-error-accent"
            role="alert"
          >
            {surfaceError}
          </p>
        ) : null}
        {loading ? (
          <p className="p-mca-base text-sm text-mca-ink-subtle">Searching…</p>
        ) : rows.length === 0 ? (
          <p className="p-mca-base text-sm text-mca-ink-subtle">
            {debounced
              ? "No cards match."
              : "Type a name or browse filters."}
          </p>
        ) : rows.length <= 6 ? (
          <ul className="space-y-mca-sm">
            {rows.map((row) => (
              <DeckSearchCardRow
                key={row.id}
                row={row}
                preview={preview}
                addingId={addingId}
                onAdd={addToDeck}
              />
            ))}
          </ul>
        ) : (
          <McaVirtualList
            className="min-h-0 flex-1"
            items={rows}
            estimateSize={84}
            overscan={10}
            getItemKey={(r) => r.id}
            renderItem={(row) => (
              <DeckSearchCardRow
                row={row}
                preview={preview}
                addingId={addingId}
                onAdd={addToDeck}
              />
            )}
          />
        )}
      </section>
    </aside>
  );
}
