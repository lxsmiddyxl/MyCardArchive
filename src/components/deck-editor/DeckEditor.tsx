"use client";

import { supabaseBrowser } from "@/lib/supabase/browser";
import type { CatalogLike, LoadDeckEditorPayload } from "@/lib/supabase/loadDeckEditor";
import type { Database } from "@/lib/supabase/types";
import type { CatalogSearchFilters } from "./CatalogSearch";
import { CatalogSearch } from "./CatalogSearch";
import { CardGrid } from "./CardGrid";
import { DeckAnalytics } from "./DeckAnalytics";
import { DeckSidebar, type DeckSidebarCard } from "./DeckSidebar";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

type DeckCardState = {
  card_id: string;
  section: string;
  quantity: number;
};

type DeckState = {
  byKey: Record<string, DeckCardState>;
};

type Action =
  | { type: "INIT"; cards: DeckCardState[] }
  | { type: "ADD"; cardId: string; section: string; amount: number }
  | { type: "SET"; cardId: string; section: string; quantity: number };

function keyFor(cardId: string, section: string): string {
  return `${section}:${cardId}`;
}

function reducer(state: DeckState, action: Action): DeckState {
  if (action.type === "INIT") {
    const byKey: Record<string, DeckCardState> = {};
    action.cards.forEach((c) => {
      byKey[keyFor(c.card_id, c.section)] = c;
    });
    return { byKey };
  }

  const next: Record<string, DeckCardState> = { ...state.byKey };
  const key = keyFor(action.cardId, action.section);
  const cur = next[key];

  if (action.type === "ADD") {
    const quantity = (cur?.quantity ?? 0) + action.amount;
    if (quantity <= 0) {
      delete next[key];
    } else {
      next[key] = {
        card_id: action.cardId,
        section: action.section,
        quantity,
      };
    }
    return { byKey: next };
  }

  if (action.type === "SET") {
    if (action.quantity <= 0) {
      delete next[key];
    } else {
      next[key] = {
        card_id: action.cardId,
        section: action.section,
        quantity: action.quantity,
      };
    }
    return { byKey: next };
  }

  return state;
}

type Props = {
  payload: Omit<LoadDeckEditorPayload, "catalog" | "cardPrices"> & {
    catalog?: CatalogLike[];
    cardPrices?: Database["public"]["Tables"]["card_prices"]["Row"][];
  };
};

type CatalogCardRow = Database["public"]["Tables"]["catalog_cards"]["Row"];

const DEFAULT_FILTERS: CatalogSearchFilters = {
  query: "",
  type: "",
  rarity: "",
  setId: "",
};

export function DeckEditor({ payload }: Props) {
  const [state, dispatch] = useReducer(reducer, { byKey: {} });
  const [filters, setFilters] = useState<CatalogSearchFilters>(DEFAULT_FILTERS);
  const [filteredCatalog, setFilteredCatalog] = useState(payload.catalogCards);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cards = payload.deckCards.map((c) => ({
      card_id: c.card_id,
      section: c.section,
      quantity: c.quantity,
    }));
    dispatch({ type: "INIT", cards });
    setFilteredCatalog(payload.catalogCards);
  }, [payload.deckCards, payload.catalogCards]);

  const deckCards = useMemo(() => Object.values(state.byKey), [state.byKey]);

  const deckCardsForAnalytics = useMemo(
    () =>
      deckCards.map((c) => ({
        deck_id: payload.deck.id,
        card_id: c.card_id,
        quantity: c.quantity,
        section: c.section,
      })),
    [deckCards, payload.deck.id]
  );

  const sidebarCards = useMemo((): DeckSidebarCard[] => {
    const byId = new Map(payload.catalogCards.map((c) => [c.id, c.name]));
    return deckCards.map((c) => ({
      deck_id: payload.deck.id,
      card_id: c.card_id,
      section: c.section,
      quantity: c.quantity,
      cardName: byId.get(c.card_id) ?? c.card_id,
    }));
  }, [deckCards, payload.catalogCards, payload.deck.id]);

  const scheduleAutosave = useCallback(
    (nextCards: DeckCardState[]) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      setSaveStatus("saving");
      saveTimerRef.current = setTimeout(async () => {
        const supabase = supabaseBrowser();
        const { error: delErr } = await supabase
          .from("deck_cards")
          .delete()
          .eq("deck_id", payload.deck.id);
        if (delErr) {
          setSaveStatus("error");
          return;
        }

        const rows = nextCards
          .filter((c) => c.quantity > 0)
          .map((c) => ({
            deck_id: payload.deck.id,
            card_id: c.card_id,
            section: c.section,
            quantity: c.quantity,
          }));
        if (rows.length === 0) {
          setSaveStatus("saved");
          return;
        }
        const { error: upErr } = await supabase
          .from("deck_cards")
          .upsert(rows, { onConflict: "deck_id,card_id,section" });
        setSaveStatus(upErr ? "error" : "saved");
      }, 550);
    },
    [payload.deck.id]
  );

  useEffect(() => {
    scheduleAutosave(deckCards);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [deckCards, scheduleAutosave]);

  const addOne = useCallback((cardId: string, section = "main") => {
    dispatch({ type: "ADD", cardId, section, amount: 1 });
  }, []);

  const removeOne = useCallback((cardId: string, section: string) => {
    dispatch({ type: "ADD", cardId, section, amount: -1 });
  }, []);

  const onSearchChange = useCallback(
    (next: CatalogSearchFilters, filtered: CatalogCardRow[]) => {
      setFilters(next);
      setFilteredCatalog(filtered);
    },
    []
  );

  return (
    <div className="space-y-mca-base">
      <div className="flex items-center justify-between rounded-mca-card border border-mca-border bg-mca-surface-elevated/50 px-mca-base py-mca-sm">
        <p className="text-sm text-mca-ink-muted">
          Deck editor · <span className="text-mca-ink-soft">{payload.deck.name}</span>
        </p>
        <p
          className={`text-xs ${
            saveStatus === "error" ? "text-red-300" : "text-mca-ink-subtle"
          }`}
        >
          {saveStatus === "saving"
            ? "Saving…"
            : saveStatus === "saved"
              ? "Saved"
              : saveStatus === "error"
                ? "Save error"
                : "Idle"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-mca-base xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <DeckSidebar
          deckName={payload.deck.name}
          cards={sidebarCards}
          focusedKey={focusedKey}
          onFocusCard={(cardId, section) => setFocusedKey(keyFor(cardId, section))}
          onAddOne={addOne}
          onRemoveOne={removeOne}
        />

        <main className="space-y-mca-base">
          <CatalogSearch
            catalogCards={payload.catalogCards}
            value={filters}
            onChange={onSearchChange}
          />
          <CardGrid cards={filteredCatalog} onAddCard={(cardId) => addOne(cardId, "main")} />
        </main>

        <DeckAnalytics
          deckCards={deckCardsForAnalytics}
          catalogCards={payload.catalogCards}
          cardPrices={payload.cardPrices ?? []}
        />
      </div>
    </div>
  );
}
