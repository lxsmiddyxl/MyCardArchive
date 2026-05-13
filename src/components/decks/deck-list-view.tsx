"use client";

import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { formatRelativeTime } from "@/lib/format-relative";
import { fetchJson, fetchJsonErrorMessage } from "@/lib/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CreateDeckModal } from "./create-deck-modal";
import { DeckCard } from "./deck-card";
import { DeleteDeckModal } from "./delete-deck-modal";
import { RenameDeckModal } from "./rename-deck-modal";

type DeckStatsEmbed = {
  total_cards: number;
  synergy_score: number;
  legality_status: string;
} | null;

type DeckListRow = {
  id: string;
  name: string;
  format: string;
  created_at: string;
  deck_stats: DeckStatsEmbed | DeckStatsEmbed[];
};

function normalizeStats(deck: DeckListRow): {
  total_cards: number;
  synergy_score: number | null;
  legality_status: string;
} {
  const raw = deck.deck_stats;
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s) {
    return {
      total_cards: 0,
      synergy_score: null,
      legality_status: "—",
    };
  }
  const synergy =
    typeof s.synergy_score === "number" && Number.isFinite(s.synergy_score)
      ? s.synergy_score
      : null;
  return {
    total_cards: s.total_cards ?? 0,
    synergy_score: synergy,
    legality_status: s.legality_status ?? "—",
  };
}

export function DeckListView() {
  const [decks, setDecks] = useState<DeckListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [rename, setRename] = useState<{ id: string; name: string } | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const loadDecks = useCallback(async () => {
    setError(null);
    try {
      const r = await fetchJson<{ decks: DeckListRow[] }>("/api/decks/list");
      if (r.kind !== "ok") {
        if (r.kind === "error" && r.status === 401) {
          window.location.href = authSignInUrl("/decks");
          return;
        }
        const detail =
          r.kind === "error" ? fetchJsonErrorMessage(r) : "Could not load decks.";
        const needsLead =
          r.kind === "network" ||
          (r.kind === "error" && (r.status >= 500 || r.status === 0));
        setError(needsLead ? `Couldn't load your decks. ${detail}` : detail);
        setDecks([]);
        return;
      }
      setDecks(Array.isArray(r.data.decks) ? r.data.decks : []);
    } catch {
      setError("Network error. Try refreshing the page.");
      setDecks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDecks();
  }, [loadDecks]);

  const handleRename = useCallback((deckId: string) => {
    const d = decks.find((x) => x.id === deckId);
    if (d) setRename({ id: d.id, name: d.name });
  }, [decks]);

  const handleDelete = useCallback((deckId: string) => {
    const d = decks.find((x) => x.id === deckId);
    if (d) setDeleteTarget({ id: d.id, name: d.name });
  }, [decks]);

  const showEmpty = !loading && !error && decks.length === 0;

  const deckCardRows = useMemo(
    () =>
      decks.map((deck) => ({
        deck,
        stats: normalizeStats(deck),
        createdAtLabel: formatRelativeTime(deck.created_at),
      })),
    [decks]
  );

  return (
    <section
      aria-label="Your decks"
      aria-live="polite"
      aria-busy={loading}
      className="space-y-mca-2xl"
    >
      <div className="flex flex-col gap-mca-base sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-mca-ink-strong sm:text-4xl">
          Your Decks
        </h1>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex w-full items-center justify-center rounded-mca-card bg-mca-accent-strong/90 px-mca-comfortable py-mca-tight text-sm font-semibold text-mca-on-accent shadow-[0_4px_20px_-4px_rgba(245,158,11,0.45)] transition hover:bg-mca-accent hover:shadow-[0_8px_28px_-6px_rgba(245,158,11,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mca-accent sm:w-auto"
        >
          Create Deck
        </button>
      </div>

      {loading ? (
        <p
          className="text-sm text-mca-ink-subtle"
          role="status"
          aria-busy="true"
          aria-live="polite"
        >
          Loading decks…
        </p>
      ) : null}

      {error ? (
        <p className="rounded-mca-card border border-mca-warning-surface-border/60 bg-mca-warning-surface/30 px-mca-base py-mca-compact text-sm text-mca-nav-accent">
          {error}
        </p>
      ) : null}

      {showEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-mca-sheet border border-dashed border-mca-border-subtle bg-mca-surface-elevated/30 px-mca-xl py-mca-stage text-center">
          <div
            className="mb-mca-xl flex h-40 w-full max-w-xs items-center justify-center rounded-mca-sheet border border-mca-border bg-gradient-to-br from-mca-surface-elevated via-mca-surface to-mca-surface-elevated shadow-inner"
            aria-hidden="true"
          >
            <DeckStackIllustration className="h-28 w-28 text-mca-border-subtle" />
          </div>
          <p className="text-lg font-medium text-mca-ink-soft">
            You don&apos;t have any Pokémon decks yet.
          </p>
          <p className="mt-mca-sm max-w-sm text-sm leading-relaxed text-mca-ink-subtle">
            Start a list for Standard, Expanded, or Commander-style play—then add cards from search
            and keep legality hints in sync.
          </p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-mca-xl inline-flex items-center justify-center rounded-mca-card bg-mca-accent-strong/90 px-mca-comfortable py-mca-tight text-sm font-semibold text-mca-on-accent shadow-[0_4px_20px_-4px_rgba(245,158,11,0.45)] transition hover:bg-mca-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mca-accent"
          >
            Create your first deck
          </button>
        </div>
      ) : null}

      {!loading && !error && decks.length > 0 ? (
        <ul className="grid gap-mca-lg sm:grid-cols-2 xl:grid-cols-3">
          {deckCardRows.map(({ deck, stats, createdAtLabel }) => (
            <li key={deck.id}>
              <DeckCard
                id={deck.id}
                name={deck.name}
                format={deck.format}
                total_cards={stats.total_cards}
                synergy_score={stats.synergy_score}
                legality_status={stats.legality_status}
                createdAtLabel={createdAtLabel}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            </li>
          ))}
        </ul>
      ) : null}

      <CreateDeckModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void loadDecks()}
      />

      <RenameDeckModal
        open={rename != null}
        deckId={rename?.id ?? null}
        initialName={rename?.name ?? ""}
        onClose={() => setRename(null)}
        onRenamed={() => void loadDecks()}
      />

      <DeleteDeckModal
        open={deleteTarget != null}
        deckId={deleteTarget?.id ?? null}
        deckName={deleteTarget?.name ?? ""}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => void loadDecks()}
      />
    </section>
  );
}

function DeckStackIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="18"
        y="28"
        width="74"
        height="94"
        rx="6"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.35"
      />
      <rect
        x="26"
        y="20"
        width="74"
        height="94"
        rx="6"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.55"
      />
      <rect
        x="34"
        y="12"
        width="74"
        height="94"
        rx="6"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.85"
      />
      <path
        d="M48 38h46M48 52h38"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
