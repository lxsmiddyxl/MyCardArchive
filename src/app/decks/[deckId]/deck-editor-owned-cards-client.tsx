"use client";

import { SwipeRevealActions } from "@/components/mobile/swipe-reveal-actions";
import { DeckIntelligencePanel } from "@/components/decks/deck-intelligence-panel";
import { ExportDeckModal } from "@/components/decks/export-deck-modal";
import { ImportDeckModal } from "@/components/decks/import-deck-modal";
import { Icon } from "@/mca-ui/icon";
import { InlineError } from "@/mca-ui/inline-error";
import { LoadingButton, LoadingSpinner } from "@/mca-ui/loading-button";
import { RemoteCardThumb } from "@/mca-ui/remote-card-thumb";
import {
  DECK_FORMAT_OPTIONS,
  deckFormatToSelectValue,
  type DeckFormatOptionValue,
} from "@/lib/decks/format-options";
import { useCallback, useMemo } from "@/lib/perf/memo";
import Link from "next/link";
import dynamic from "next/dynamic";
import { fetchJson, fetchJsonErrorMessage } from "@/lib/client";
import type { DeckCardsByZoneDTO, DeckCardsListPayloadDTO } from "@/lib/dto/deck-builder";
import { useRouter } from "next/navigation";
import { useMobileVirtualOverscan } from "@/lib/ui/use-mobile-virtual-overscan";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useState } from "react";
import { useLongPress } from "@/lib/ui/use-long-press";
import { useMcaGridColumns } from "@/lib/ui/use-mca-grid-columns";
import { FtueOverlay } from "@/components/onboarding/ftue-overlay";
import { mcaLog } from "@/lib/logging/mca-log-client";
import {
  enqueueOfflineAction,
  finalizeOfflineAction,
  isLikelyOfflineError,
  listOfflineActions,
} from "@/lib/mobile/offline-action-queue";
import { LKG_KEY, lkgGet, lkgSet } from "@/lib/offline/surface-lkg";
import { McaIcons } from "@/lib/icons/mca-icons";
import {
  getPresenceMemberCountSync,
  joinPresence,
  leavePresence,
  presenceDeckEditor,
  subscribeToPresence,
} from "@/lib/realtime/channels";
import { supabaseBrowser } from "@/lib/supabase/browser";
import {
  useInteractionTiming,
  useListRenderStats,
  useSuspenseProfile,
} from "@/lib/telemetry";

const CardDetailModal = dynamic(
  () =>
    import("@/components/cards/card-detail-modal").then((m) => ({
      default: m.CardDetailModal,
    })),
  { loading: () => null, ssr: false }
);

type SearchCardRow = {
  id: string;
  name: string;
  image_url: string | null;
  rarity: string | null;
  set: string | null;
  type: string | null;
};

type DeckCardsByZone = DeckCardsByZoneDTO;

type DeckLegalityPayload = {
  format: string;
  legal: boolean;
  issues: { card_id: string; name: string; reason: string }[];
};

type DeckStatsPayload = {
  is_public?: boolean;
  type_distribution: Record<string, number> | null;
  rarity_distribution: Record<string, number> | null;
  set_distribution: Record<string, number> | null;
  estimated_value: number | string | null;
  top_cards:
    | {
        id: string;
        name: string;
        image_url: string | null;
        price: number | null;
      }[]
    | null;
};

type DeckDeckStatsPayload = {
  total_cards: number;
  unique_cards: number;
  color_identity: string[];
  updated_at?: string;
} | null;

type Props = {
  deckId: string;
};

type BusyAction =
  | null
  | { kind: "add"; cardId: string; zone: "main" | "sideboard" | "commander" }
  | { kind: "remove"; cardId: string; zone: "main" | "sideboard" | "commander" }
  | {
      kind: "move";
      cardId: string;
      from: keyof DeckCardsByZone;
      to: keyof DeckCardsByZone;
    };

const EMPTY_ZONES: DeckCardsByZone = {
  main: [],
  sideboard: [],
  commander: [],
};

const ZONE_META: {
  id: keyof DeckCardsByZone;
  label: string;
  icon: string;
  hint?: string;
}[] = [
  { id: "main", label: "Main deck", icon: McaIcons.collection.zoneMain },
  { id: "sideboard", label: "Side deck", icon: McaIcons.collection.zoneSideboard },
  {
    id: "commander",
    label: "Brawl",
    icon: McaIcons.collection.zoneCommander,
    hint: "Optional · Brawl-style formats",
  },
];

const ZONE_MOVE_TARGETS: Record<
  keyof DeckCardsByZone,
  { to: keyof DeckCardsByZone; label: string }[]
> = {
  main: [
    { to: "sideboard", label: "To side deck" },
    { to: "commander", label: "To Brawl" },
  ],
  sideboard: [
    { to: "main", label: "To main deck" },
    { to: "commander", label: "To Brawl" },
  ],
  commander: [
    { to: "main", label: "To main deck" },
    { to: "sideboard", label: "To side deck" },
  ],
};

function deckValueSparkline(values: number[], w: number, h: number): string {
  if (values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const n = Math.max(values.length - 1, 1);
  return values
    .map((v, i) => {
      const x = (i / n) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function colorChipClass(token: string): string {
  const t = token.toLowerCase();
  const map: Record<string, string> = {
    grass: "bg-mca-success-tint text-mca-success-text dark:bg-mca-success-bold/20 dark:text-mca-success-ink",
    fire: "bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-200",
    water: "bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-200",
    lightning: "bg-yellow-100 text-yellow-900 dark:bg-yellow-500/20 dark:text-yellow-200",
    psychic: "bg-purple-100 text-purple-900 dark:bg-purple-500/20 dark:text-purple-200",
    fighting: "bg-orange-100 text-orange-900 dark:bg-orange-500/20 dark:text-orange-200",
    darkness: "bg-mca-border-subtle text-mca-ink-strong dark:bg-mca-neutral-dot dark:text-mca-ink",
    metal: "bg-slate-200 text-slate-900 dark:bg-slate-500/30 dark:text-slate-100",
    fairy: "bg-pink-100 text-pink-900 dark:bg-pink-500/20 dark:text-pink-200",
    dragon: "bg-indigo-100 text-indigo-900 dark:bg-indigo-500/20 dark:text-indigo-200",
    colorless: "bg-mca-border-light text-mca-chrome dark:bg-mca-border-subtle dark:text-mca-ink-soft",
    normal: "bg-stone-200 text-stone-800 dark:bg-stone-600/30 dark:text-stone-100",
  };
  return map[t] ?? "bg-mca-border-light text-mca-chrome dark:bg-mca-border-subtle dark:text-mca-ink-soft";
}

function ColorIdentityBadges({ colors }: { colors: string[] }) {
  if (!colors.length) {
    return <span className="text-xs text-mca-ink-subtle">No type tags yet</span>;
  }
  return (
    <div className="flex flex-wrap gap-mca-micro">
      {colors.map((c) => (
        <span
          key={c}
          className={`inline-flex rounded-mca-control px-mca-sm py-mca-trace text-[11px] font-semibold uppercase tracking-wide ${colorChipClass(c)}`}
        >
          {c}
        </span>
      ))}
    </div>
  );
}

function TypeCompositionBars({
  dist,
}: {
  dist: Record<string, number> | null | undefined;
}) {
  const entries = Object.entries(dist ?? {}).filter(([, v]) => v > 0);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  if (entries.length === 0) {
    return <p className="text-xs text-mca-ink-subtle">Add cards to see composition by supertype.</p>;
  }
  return (
    <ul className="space-y-mca-sm">
      {entries
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => (
          <li key={label}>
            <div className="mb-mca-trace flex justify-between text-[11px] text-mca-ink-muted">
              <span className="font-medium text-mca-ink-body">{label}</span>
              <span className="tabular-nums">{count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-mca-chrome">
              <div
                className="h-full rounded-full bg-gradient-to-r from-mca-accent-border/80 to-mca-focus-soft/70 transition-all duration-300 ease-out"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
    </ul>
  );
}

function DeckZoneTitleWithLongPress({
  cardId,
  cardName,
  illegal,
  onOpenDetail,
  traceId,
}: {
  cardId: string;
  cardName: string;
  illegal: boolean;
  onOpenDetail: (id: string) => void;
  traceId: string;
}) {
  const lp = useLongPress(
    () => {
      mcaLog.event(
        "mobile.gesture",
        { kind: "long_press_card", surface: "deck-zone" },
        { componentName: "DeckEditorOwnedCardsClient", surfaceName: "deck-editor", traceId }
      );
      onOpenDetail(cardId);
    },
    { durationMs: 520 }
  );
  return (
    <button
      type="button"
      onClick={() => onOpenDetail(cardId)}
      onPointerDown={lp.onPointerDown}
      onPointerMove={lp.onPointerMove}
      onPointerUp={lp.onPointerUp}
      onPointerCancel={lp.onPointerCancel}
      className="min-w-0 flex-1 rounded-mca-control text-left transition-all duration-200 ease-mca-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60"
    >
      <p className="flex flex-wrap items-center gap-mca-sm text-sm text-mca-ink-strong">
        {illegal ? <Icon src={McaIcons.ui.warning} size="sm" alt="" /> : null}
        <span>{cardName}</span>
      </p>
    </button>
  );
}

export function DeckEditorOwnedCardsClient({ deckId }: Props) {
  const router = useRouter();
  const [deckCards, setDeckCards] = useState<DeckCardsByZone>(EMPTY_ZONES);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [setFilter, setSetFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [rarityFilter, setRarityFilter] = useState("");
  const [facetSets, setFacetSets] = useState<{ id: string; name: string }[]>([]);
  const [facetTypes, setFacetTypes] = useState<string[]>([]);
  const [facetRarities, setFacetRarities] = useState<string[]>([]);

  const [searchResults, setSearchResults] = useState<SearchCardRow[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const searchReqId = useRef(0);
  /** Ignore stale `cards/list` responses when rapid mutations overlap. */
  const zonesFetchSeq = useRef(0);
  const summaryFetchSeq = useRef(0);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [loadingCards, setLoadingCards] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingValue, setLoadingValue] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectionErrors, setSectionErrors] = useState<{
    stats: string | null;
    legality: string | null;
    price: string | null;
    synergy: string | null;
  }>({ stats: null, legality: null, price: null, synergy: null });
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [stats, setStats] = useState<DeckStatsPayload | null>(null);
  const [deckStats, setDeckStats] = useState<DeckDeckStatsPayload>(null);
  const [legality, setLegality] = useState<DeckLegalityPayload | null>(null);
  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const [deckValuePoints, setDeckValuePoints] = useState<
    { recorded_at: string; total_value: number }[]
  >([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const [editorName, setEditorName] = useState("");
  const [editorFormat, setEditorFormat] = useState<DeckFormatOptionValue>("standard");
  const [editorDescription, setEditorDescription] = useState("");
  const [metaSaving, setMetaSaving] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const hasLoadedDeckMeta = useRef(false);

  const [synergyScore, setSynergyScore] = useState<number | null>(null);
  const [synergyLoading, setSynergyLoading] = useState(false);

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const summaryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [collapsedZones, setCollapsedZones] = useState<Record<string, boolean>>({
    main: false,
    sideboard: false,
    commander: false,
  });
  /** Roving keyboard focus within a zone list (`zone:cardId`). */
  const [zoneFocusKey, setZoneFocusKey] = useState<string | null>(null);

  const dk = useMemo(() => encodeURIComponent(deckId), [deckId]);

  const telemetryCtx = useMemo(
    () => ({
      componentName: "DeckEditorOwnedCardsClient",
      surfaceName: "deck-editor",
      traceId: deckId,
    }),
    [deckId]
  );
  useSuspenseProfile("deck-editor", telemetryCtx);
  useListRenderStats("deck-search", searchResults.length, telemetryCtx);
  const deckSearchInteract = useInteractionTiming("deck-search", telemetryCtx);

  const [presencePeers, setPresencePeers] = useState(0);
  const deckConflictLogged = useRef(false);

  useEffect(() => {
    const topic = presenceDeckEditor(deckId);
    let unsub: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const supabase = supabaseBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      try {
        await joinPresence(topic, {
          user_id: user.id,
          deck_id: deckId,
          surface: "deck_editor",
        });
      } catch {
        /* realtime unavailable */
      }
      unsub = subscribeToPresence(topic, {
        onSync: () => {
          const n = getPresenceMemberCountSync(topic);
          const peers = Math.max(0, n - 1);
          setPresencePeers(peers);
          if (peers > 0 && !deckConflictLogged.current) {
            deckConflictLogged.current = true;
            mcaLog.event(
              "presence.conflict",
              { surface: "deck-editor", peers, deckId },
              telemetryCtx
            );
          }
          if (peers === 0) deckConflictLogged.current = false;
        },
      });
    })();
    return () => {
      cancelled = true;
      unsub?.();
      void leavePresence(topic);
    };
  }, [deckId, telemetryCtx]);

  const refreshZones = useCallback(async (): Promise<boolean> => {
    const seq = ++zonesFetchSeq.current;
    try {
      const r = await fetchJson<DeckCardsListPayloadDTO>(
        `/api/decks/${dk}/cards/list`,
        { cache: "no-store" }
      );
      if (zonesFetchSeq.current !== seq) return true;
      if (r.kind !== "ok") {
        throw new Error(fetchJsonErrorMessage(r));
      }
      const next =
        r.data.cards ??
        ({
          main: [],
          sideboard: [],
          commander: [],
        } satisfies DeckCardsByZone);
      setDeckCards(next);
      lkgSet(LKG_KEY.deckCards(deckId), next);
      return true;
    } catch (e) {
      if (zonesFetchSeq.current !== seq) return true;
      const lkg = lkgGet<DeckCardsByZone>(LKG_KEY.deckCards(deckId));
      const hasCards =
        lkg &&
        (lkg.main.length > 0 || lkg.sideboard.length > 0 || lkg.commander.length > 0);
      if (hasCards && lkg) {
        setDeckCards(lkg);
        mcaLog.event(
          "offline.lkg.restore",
          { surface: "deck-editor", key: "deck-cards" },
          telemetryCtx
        );
        setError(
          "You're offline or the network failed — showing the last loaded deck list."
        );
        return true;
      }
      setError(e instanceof Error ? e.message : "Failed to load deck cards");
      return false;
    }
  }, [deckId, dk, telemetryCtx]);

  useEffect(() => {
    const flush = async () => {
      const pending = listOfflineActions().filter(
        (a) => a.kind === "deck_zone_change" && a.deckId === deckId
      );
      for (const p of pending) {
        if (p.kind !== "deck_zone_change") continue;
        try {
          if (p.action === "add" && p.zone) {
            const res = await fetch(`/api/decks/${dk}/cards/add`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ card_id: p.cardId, zone: p.zone }),
            });
            if (res.ok) {
              finalizeOfflineAction(p.id, "synced");
              mcaLog.event(
                "mobile.offline.queue",
                { kind: "deck_zone_change", op: "flush_ok", id: p.id },
                telemetryCtx
              );
              await refreshZones();
            }
          } else if (p.action === "remove" && p.zone) {
            const res = await fetch(`/api/decks/${dk}/cards/remove`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ card_id: p.cardId, zone: p.zone }),
            });
            if (res.ok) {
              finalizeOfflineAction(p.id, "synced");
              await refreshZones();
            }
          } else if (p.action === "move" && p.fromZone && p.toZone) {
            const res = await fetch("/api/decks/move-card", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                deck_id: deckId,
                card_id: p.cardId,
                from_section: p.fromZone,
                to_section: p.toZone,
              }),
            });
            if (res.ok) {
              finalizeOfflineAction(p.id, "synced");
              await refreshZones();
            }
          }
        } catch {
          break;
        }
      }
    };
    void flush();
    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [deckId, dk, refreshZones, telemetryCtx]);

  const refreshSummaryOnly = useCallback(async (): Promise<void> => {
    const seq = ++summaryFetchSeq.current;
    const summaryRes = await fetch(`/api/decks/${dk}/summary`, { cache: "no-store" });
    const summaryBody = (await summaryRes.json().catch(() => ({}))) as {
      deck?: DeckStatsPayload;
      deck_stats?: DeckDeckStatsPayload;
      deck_meta?: {
        name: string;
        format: string;
        description: string;
      };
      legality?: {
        format?: string;
        legal?: boolean;
        issues?: DeckLegalityPayload["issues"];
      };
      error?: string;
    };
    if (!summaryRes.ok) {
      const msg = summaryBody.error ?? "Failed to load deck summary";
      if (summaryFetchSeq.current === seq) {
        setStats(null);
        setDeckStats(null);
        setLegality(null);
        setSectionErrors((s) => ({ ...s, stats: msg, legality: msg }));
      }
      throw new Error(msg);
    }
    if (summaryFetchSeq.current !== seq) return;
    const deckStatsPayload = summaryBody.deck ?? null;
    setStats(deckStatsPayload);
    setDeckStats(summaryBody.deck_stats ?? null);
    if (typeof deckStatsPayload?.is_public === "boolean") {
      setIsPublic(deckStatsPayload.is_public);
    }
    const dm = summaryBody.deck_meta;
    if (dm && !hasLoadedDeckMeta.current) {
      setEditorName(dm.name);
      setEditorFormat(deckFormatToSelectValue(dm.format));
      setEditorDescription(
        typeof dm.description === "string" ? dm.description : ""
      );
      hasLoadedDeckMeta.current = true;
    }
    const L = summaryBody.legality;
    if (L && typeof L.legal === "boolean") {
      setLegality({
        format: typeof L.format === "string" ? L.format : "standard",
        legal: L.legal,
        issues: Array.isArray(L.issues) ? L.issues : [],
      });
    } else {
      setLegality(null);
    }
    setSectionErrors((s) => ({ ...s, stats: null, legality: null }));
  }, [dk]);

  const refreshSynergy = useCallback(async (): Promise<void> => {
    setSynergyLoading(true);
    setSectionErrors((s) => ({ ...s, synergy: null }));
    try {
      const res = await fetch("/api/decks/synergy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deck_id: deckId }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        synergy_score?: number;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error ?? "Could not compute synergy");
      }
      const sc =
        typeof body.synergy_score === "number" && Number.isFinite(body.synergy_score)
          ? body.synergy_score
          : null;
      setSynergyScore(sc);
    } catch (e) {
      setSectionErrors((s) => ({
        ...s,
        synergy: e instanceof Error ? e.message : "Synergy failed",
      }));
    } finally {
      setSynergyLoading(false);
    }
  }, [deckId]);

  const scheduleSummaryRefresh = useCallback(() => {
    setSaveStatus("saving");
    if (summaryDebounceRef.current) {
      clearTimeout(summaryDebounceRef.current);
    }
    if (savedClearRef.current) {
      clearTimeout(savedClearRef.current);
      savedClearRef.current = null;
    }
    summaryDebounceRef.current = setTimeout(() => {
      summaryDebounceRef.current = null;
      void (async () => {
        try {
          await refreshSummaryOnly();
          await refreshSynergy();
          router.refresh();
          setSaveStatus("saved");
          savedClearRef.current = setTimeout(() => {
            setSaveStatus("idle");
            savedClearRef.current = null;
          }, 2200);
        } catch {
          setSaveStatus("error");
        }
      })();
    }, 500);
  }, [refreshSummaryOnly, refreshSynergy, router]);

  useEffect(() => {
    return () => {
      if (summaryDebounceRef.current) clearTimeout(summaryDebounceRef.current);
      if (savedClearRef.current) clearTimeout(savedClearRef.current);
    };
  }, []);

  useEffect(() => {
    hasLoadedDeckMeta.current = false;
  }, [deckId]);

  useEffect(() => {
    if (!zoneFocusKey) return;
    requestAnimationFrame(() => {
      const esc =
        typeof CSS !== "undefined" && typeof CSS.escape === "function"
          ? CSS.escape(zoneFocusKey)
          : zoneFocusKey.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const el = document.querySelector(`[data-deck-zone-slot="${esc}"]`);
      if (el instanceof HTMLElement) el.focus();
    });
  }, [zoneFocusKey]);

  const loadInitial = useCallback(async () => {
    setError(null);
    setSectionErrors({ stats: null, legality: null, price: null, synergy: null });
    setLoadingCards(true);
    setLoadingSummary(true);
    setLoadingValue(true);

    const pCards = (async () => {
      try {
        const ok = await refreshZones();
        if (!ok) throw new Error("Failed to load deck zones");
      } finally {
        setLoadingCards(false);
      }
    })();

    const pSummary = (async () => {
      try {
        await refreshSummaryOnly();
        await refreshSynergy();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load deck summary";
        setSectionErrors((s) => ({ ...s, stats: msg, legality: msg }));
      } finally {
        setLoadingSummary(false);
      }
    })();

    const pValue = (async () => {
      try {
        const valueRes = await fetch(`/api/decks/${dk}/value-history`, { cache: "no-store" });
        const valueBody = (await valueRes.json().catch(() => ({}))) as {
          points?: { recorded_at: string; total_value: number }[];
          error?: string;
        };
        if (!valueRes.ok) {
          throw new Error(valueBody.error ?? "Failed to load deck value history");
        }
        setDeckValuePoints(Array.isArray(valueBody.points) ? valueBody.points : []);
      } catch (e) {
        setDeckValuePoints([]);
        setSectionErrors((s) => ({
          ...s,
          price: e instanceof Error ? e.message : "Failed to load value history",
        }));
      } finally {
        setLoadingValue(false);
      }
    })();

    await Promise.all([pCards, pSummary, pValue]);
  }, [dk, refreshZones, refreshSummaryOnly, refreshSynergy]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/cards/facets", { cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as {
          sets?: { id: string; name: string }[];
          types?: string[];
          rarities?: string[];
          error?: string;
        };
        if (!res.ok || cancelled) return;
        if (Array.isArray(body.sets)) setFacetSets(body.sets);
        if (Array.isArray(body.types)) setFacetTypes(body.types);
        if (Array.isArray(body.rarities)) setFacetRarities(body.rarities);
      } catch {
        /* filters optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(searchInput.trim()), 320);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const runId = ++searchReqId.current;
    setSearchLoading(true);
    setSearchError(null);

    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (setFilter) params.set("set", setFilter);
    if (typeFilter) params.set("type", typeFilter);
    if (rarityFilter) params.set("rarity", rarityFilter);
    params.set("offset", "0");
    params.set("limit", "24");

    void (async () => {
      try {
        const res = await fetch(`/api/cards/search?${params}`, { cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as {
          cards?: SearchCardRow[];
          total?: number;
          hasMore?: boolean;
          error?: string;
        };
        if (searchReqId.current !== runId) return;
        if (!res.ok) {
          setSearchError(body.error ?? "Search failed");
          setSearchResults([]);
          setSearchHasMore(false);
          setSearchTotal(0);
          return;
        }
        setSearchResults(Array.isArray(body.cards) ? body.cards : []);
        setSearchTotal(typeof body.total === "number" ? body.total : 0);
        setSearchHasMore(Boolean(body.hasMore));
      } catch {
        if (searchReqId.current !== runId) return;
        setSearchError("Search failed");
        setSearchResults([]);
      } finally {
        if (searchReqId.current === runId) {
          setSearchLoading(false);
          deckSearchInteract.end();
        }
      }
    })();
  }, [debouncedQ, deckSearchInteract, setFilter, typeFilter, rarityFilter]);

  const loadMoreSearch = useCallback(() => {
    if (!searchHasMore || searchLoadingMore || searchLoading) return;
    const runId = searchReqId.current;
    setSearchLoadingMore(true);
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (setFilter) params.set("set", setFilter);
    if (typeFilter) params.set("type", typeFilter);
    if (rarityFilter) params.set("rarity", rarityFilter);
    params.set("offset", String(searchResults.length));
    params.set("limit", "24");

    void (async () => {
      try {
        const res = await fetch(`/api/cards/search?${params}`, { cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as {
          cards?: SearchCardRow[];
          hasMore?: boolean;
          error?: string;
        };
        if (searchReqId.current !== runId) return;
        if (!res.ok) {
          setSearchError(body.error ?? "Could not load more");
          return;
        }
        const next = Array.isArray(body.cards) ? body.cards : [];
        setSearchResults((prev) => [...prev, ...next]);
        setSearchHasMore(Boolean(body.hasMore));
      } finally {
        setSearchLoadingMore(false);
      }
    })();
  }, [
    debouncedQ,
    setFilter,
    typeFilter,
    rarityFilter,
    searchHasMore,
    searchLoadingMore,
    searchLoading,
    searchResults.length,
  ]);

  const gridCols = useMcaGridColumns();
  const searchScrollRef = useRef<HTMLDivElement>(null);
  const enableSearchVirtual = searchResults.length > 6;
  const searchRowCount = Math.ceil(searchResults.length / gridCols);

  const searchOverscan = useMobileVirtualOverscan(3);
  const searchRowVirtualizer = useVirtualizer({
    count: enableSearchVirtual ? searchRowCount : 0,
    getScrollElement: () => searchScrollRef.current,
    estimateSize: () => 160,
    overscan: searchOverscan,
  });

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const root = enableSearchVirtual ? searchScrollRef.current : null;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadMoreSearch();
        }
      },
      { root: root ?? undefined, rootMargin: "120px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMoreSearch, searchResults.length, enableSearchVirtual]);

  const illegalCardIds = useMemo(() => {
    const ids = new Set<string>();
    for (const issue of legality?.issues ?? []) {
      if (issue.card_id && issue.card_id.length > 0) ids.add(issue.card_id);
    }
    return ids;
  }, [legality]);

  const deckValueSpark = useMemo(
    () => deckValuePoints.map((p) => p.total_value),
    [deckValuePoints]
  );

  const zoneQty = useCallback((zone: keyof DeckCardsByZone) => {
    return (deckCards[zone] ?? []).reduce((n, r) => n + r.quantity, 0);
  }, [deckCards]);

  const toggleZone = (z: string) => {
    setCollapsedZones((c) => {
      const collapsed = !c[z];
      mcaLog.event(
        "ui.microinteraction",
        { kind: "deck_zone_toggle", zone: z, collapsed },
        telemetryCtx
      );
      return { ...c, [z]: collapsed };
    });
  };

  const isAddLoading = useCallback(
    (cardId: string, zone: "main" | "sideboard" | "commander"): boolean =>
      busyAction?.kind === "add" &&
      busyAction.cardId === cardId &&
      busyAction.zone === zone,
    [busyAction]
  );

  const isRemoveLoading = useCallback(
    (cardId: string, zone: "main" | "sideboard" | "commander"): boolean =>
      busyAction?.kind === "remove" &&
      busyAction.cardId === cardId &&
      busyAction.zone === zone,
    [busyAction]
  );

  const isMoveLoading = useCallback(
    (cardId: string, from: keyof DeckCardsByZone, to: keyof DeckCardsByZone): boolean =>
      busyAction?.kind === "move" &&
      busyAction.cardId === cardId &&
      busyAction.from === from &&
      busyAction.to === to,
    [busyAction]
  );

  const addToZone = useCallback(
    async (cardId: string, zone: "main" | "sideboard" | "commander") => {
      setError(null);
      setBusyAction({ kind: "add", cardId, zone });
      try {
        const r = await fetchJson<Record<string, unknown>>(
          `/api/decks/${dk}/cards/add`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ card_id: cardId, zone }),
          }
        );
        if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
        await refreshZones();
        scheduleSummaryRefresh();
        mcaLog.event("deck.editor.card_add", { zone }, telemetryCtx);
      } catch (e) {
        if (isLikelyOfflineError(e)) {
          enqueueOfflineAction({
            kind: "deck_zone_change",
            deckId,
            cardId,
            action: "add",
            zone,
          });
          setError("Offline — add to deck queued to retry when you are back online.");
          mcaLog.event("mobile.offline.queue", { kind: "deck_zone_change", action: "add" }, telemetryCtx);
        } else {
          setError(e instanceof Error ? e.message : "Failed to add card");
        }
      } finally {
        setBusyAction(null);
      }
    },
    [deckId, dk, refreshZones, scheduleSummaryRefresh, telemetryCtx]
  );

  const removeFromZone = useCallback(
    async (cardId: string, zone: "main" | "sideboard" | "commander") => {
      setError(null);
      setBusyAction({ kind: "remove", cardId, zone });
      try {
        const r = await fetchJson<Record<string, unknown>>(
          `/api/decks/${dk}/cards/remove`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ card_id: cardId, zone }),
          }
        );
        if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
        await refreshZones();
        scheduleSummaryRefresh();
        mcaLog.event("deck.editor.card_remove", { zone }, telemetryCtx);
      } catch (e) {
        if (isLikelyOfflineError(e)) {
          enqueueOfflineAction({
            kind: "deck_zone_change",
            deckId,
            cardId,
            action: "remove",
            zone,
          });
          setError("Offline — remove from deck queued to retry when you are back online.");
          mcaLog.event(
            "mobile.offline.queue",
            { kind: "deck_zone_change", action: "remove" },
            telemetryCtx
          );
        } else {
          setError(e instanceof Error ? e.message : "Failed to update quantity");
        }
      } finally {
        setBusyAction(null);
      }
    },
    [deckId, dk, refreshZones, scheduleSummaryRefresh, telemetryCtx]
  );

  const moveCardBetweenZones = useCallback(
    async (cardId: string, from: keyof DeckCardsByZone, to: keyof DeckCardsByZone) => {
      if (from === to) return;
      setError(null);
      setBusyAction({ kind: "move", cardId, from, to });
      try {
        const r = await fetchJson<Record<string, unknown>>("/api/decks/move-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deck_id: deckId,
            card_id: cardId,
            from_section: from,
            to_section: to,
          }),
        });
        if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
        await refreshZones();
        scheduleSummaryRefresh();
        mcaLog.event("deck.editor.card_move", { from, to }, telemetryCtx);
      } catch (e) {
        if (isLikelyOfflineError(e)) {
          enqueueOfflineAction({
            kind: "deck_zone_change",
            deckId,
            cardId,
            action: "move",
            fromZone: from,
            toZone: to,
          });
          setError("Offline — zone move queued to retry when you are back online.");
          mcaLog.event("mobile.offline.queue", { kind: "deck_zone_change", action: "move" }, telemetryCtx);
        } else {
          setError(e instanceof Error ? e.message : "Could not move card");
        }
      } finally {
        setBusyAction(null);
      }
    },
    [deckId, refreshZones, scheduleSummaryRefresh, telemetryCtx]
  );

  const saveDeckMetadata = useCallback(async () => {
    const trimmed = editorName.trim();
    if (!trimmed) {
      setMetaError("Deck name is required.");
      return;
    }
    setMetaSaving(true);
    setMetaError(null);
    try {
      const res = await fetch("/api/decks/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deck_id: deckId,
          name: trimmed,
          format: editorFormat,
          description: editorDescription,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not save deck details");
      await refreshSummaryOnly();
      await refreshSynergy();
      mcaLog.event("deck.editor.metadata_save", { format: editorFormat }, telemetryCtx);
      router.refresh();
    } catch (e) {
      setMetaError(
        e instanceof Error ? e.message : "Could not save deck details"
      );
    } finally {
      setMetaSaving(false);
    }
  }, [
    deckId,
    editorDescription,
    editorFormat,
    editorName,
    refreshSummaryOnly,
    refreshSynergy,
    router,
    telemetryCtx,
  ]);

  const setDeckVisibility = useCallback(
    async (next: boolean): Promise<boolean> => {
      setVisibilityBusy(true);
      setShareToast(null);
      try {
        const res = await fetch("/api/decks/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deck_id: deckId, is_public: next }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          deck?: { is_public?: boolean };
        };
        if (!res.ok) throw new Error(body.error ?? "Could not update visibility");
        const pub = body.deck?.is_public;
        setIsPublic(typeof pub === "boolean" ? pub : next);
        setStats((s) => (s ? { ...s, is_public: typeof pub === "boolean" ? pub : next } : s));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not update visibility");
        return false;
      } finally {
        setVisibilityBusy(false);
      }
    },
    [deckId]
  );

  const copyShareLink = useCallback(async () => {
    setShareToast(null);
    try {
      const url = `${window.location.origin}/d/${encodeURIComponent(deckId)}`;
      await navigator.clipboard.writeText(url);
      setShareToast("Link copied to clipboard");
      window.setTimeout(() => setShareToast(null), 2500);
    } catch {
      setError("Could not copy link.");
    }
  }, [deckId]);

  const makePublicAndCopy = useCallback(async () => {
    const ok = await setDeckVisibility(true);
    if (!ok) return;
    try {
      const url = `${window.location.origin}/d/${encodeURIComponent(deckId)}`;
      await navigator.clipboard.writeText(url);
      setShareToast("Deck is now public · link copied");
      window.setTimeout(() => setShareToast(null), 2800);
    } catch {
      setShareToast("Deck is now public");
      window.setTimeout(() => setShareToast(null), 2800);
    }
  }, [deckId, setDeckVisibility]);

  const renderSearchCard = useCallback((card: SearchCardRow) => {
    return (
      <div className="mca-row-reveal group flex gap-mca-compact rounded-mca-card border border-mca-border bg-mca-surface/40 p-mca-compact shadow-mca-panel transition-all duration-200 ease-mca-standard hover:-translate-y-0.5 hover:border-mca-field-border hover:shadow-mca-card dark:border-mca-border-subtle">
        <div className="relative h-24 w-[4.25rem] shrink-0 overflow-hidden rounded-mca-block border border-mca-border bg-mca-surface-elevated dark:border-mca-border-subtle">
          {card.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.image_url}
              alt=""
              className="size-full object-cover transition-transform duration-200 ease-mca-standard group-hover:scale-105"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-[10px] text-mca-hint">
              No art
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-mca-sm">
          <div>
            <p className="truncate text-sm font-medium text-mca-ink-strong">{card.name}</p>
            <p className="truncate text-[11px] text-mca-ink-subtle">
              {[card.type, card.set, card.rarity].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-mca-micro">
            <LoadingButton
              type="button"
              isLoading={isAddLoading(card.id, "main")}
              disabled={
                loadingCards || (busyAction !== null && !isAddLoading(card.id, "main"))
              }
              onClick={() => void addToZone(card.id, "main")}
              className="inline-flex items-center justify-center rounded-mca-control border border-mca-border-subtle px-mca-sm py-mca-micro text-[10px] font-medium text-mca-ink-strong transition-all duration-200 ease-mca-standard hover:bg-mca-chrome/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 disabled:opacity-50"
            >
              Main
            </LoadingButton>
            <LoadingButton
              type="button"
              isLoading={isAddLoading(card.id, "sideboard")}
              disabled={
                loadingCards ||
                (busyAction !== null && !isAddLoading(card.id, "sideboard"))
              }
              onClick={() => void addToZone(card.id, "sideboard")}
              className="inline-flex items-center justify-center rounded-mca-control border border-mca-border-subtle px-mca-sm py-mca-micro text-[10px] font-medium text-mca-ink-strong transition-all duration-200 ease-mca-standard hover:bg-mca-chrome/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 disabled:opacity-50"
            >
              Side
            </LoadingButton>
            <LoadingButton
              type="button"
              isLoading={isAddLoading(card.id, "commander")}
              disabled={
                loadingCards ||
                (busyAction !== null && !isAddLoading(card.id, "commander"))
              }
              onClick={() => void addToZone(card.id, "commander")}
              className="inline-flex items-center justify-center rounded-mca-control border border-mca-border-subtle px-mca-sm py-mca-micro text-[10px] font-medium text-mca-ink-strong transition-all duration-200 ease-mca-standard hover:bg-mca-chrome/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 disabled:opacity-50"
            >
              Cmdr
            </LoadingButton>
          </div>
        </div>
      </div>
    );
  }, [addToZone, busyAction, isAddLoading, loadingCards]);

  return (
    <section className="space-y-mca-lg">
      <div className="flex flex-col gap-mca-compact rounded-mca-block border border-mca-border bg-mca-surface-elevated/95 px-mca-base py-mca-compact shadow-mca-panel transition-all duration-200 dark:border-mca-border-subtle sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-mca-xs">
          <p className="text-xs text-mca-ink-subtle">
            Changes save to your deck automatically. Stats and legality refresh after you stop editing for a moment.
          </p>
          {presencePeers > 0 ? (
            <p className="text-xs font-medium text-mca-warning-tint">
              Another tab or device may be editing this deck ({presencePeers} other
              {presencePeers === 1 ? " session" : " sessions"}).
            </p>
          ) : null}
        </div>
        <div
          className="flex items-center gap-mca-sm text-xs font-medium tabular-nums"
          aria-live="polite"
        >
          {saveStatus === "saving" ? (
            <>
              <LoadingSpinner className="size-4 text-mca-accent/90" />
              <span className="text-mca-nav-accent/90">Saving…</span>
            </>
          ) : null}
          {saveStatus === "saved" ? (
            <span className="text-mca-success transition-opacity duration-300">Saved</span>
          ) : null}
          {saveStatus === "error" ? (
            <span className="text-mca-error-accent">Sync error — retry an edit</span>
          ) : null}
          {saveStatus === "idle" ? (
            <span className="text-mca-hint dark:text-mca-ink-subtle"> </span>
          ) : null}
        </div>
      </div>

      <div className="mca-section-reveal rounded-mca-block border border-mca-border bg-mca-surface-elevated/95 p-mca-base shadow-mca-panel dark:border-mca-border-subtle">
        <h3 className="text-sm font-semibold text-mca-ink-strong">Deck details</h3>
        <p className="mt-mca-xs text-xs text-mca-ink-subtle">
          Name, Pokémon TCG format, and notes. Changing format updates legality for Standard, Expanded, Unlimited, and Brawl-style lists.
        </p>
        <div className="mt-mca-base grid gap-mca-base sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="deck-editor-name"
              className="text-[10px] font-semibold uppercase tracking-wide text-mca-ink-subtle"
            >
              Name
            </label>
            <input
              id="deck-editor-name"
              value={editorName}
              onChange={(e) => setEditorName(e.target.value)}
              autoComplete="off"
              className="mca-input mt-mca-sm rounded-mca-control"
            />
          </div>
          <div>
            <label
              htmlFor="deck-editor-format"
              className="text-[10px] font-semibold uppercase tracking-wide text-mca-ink-subtle"
            >
              Format
            </label>
            <select
              id="deck-editor-format"
              value={editorFormat}
              onChange={(e) =>
                setEditorFormat(e.target.value as DeckFormatOptionValue)
              }
              className="mca-input mt-mca-sm rounded-mca-control py-mca-sm pl-mca-sm pr-mca-xl"
            >
              {DECK_FORMAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="deck-editor-desc"
              className="text-[10px] font-semibold uppercase tracking-wide text-mca-ink-subtle"
            >
              Description
            </label>
            <textarea
              id="deck-editor-desc"
              value={editorDescription}
              onChange={(e) => setEditorDescription(e.target.value)}
              rows={3}
              placeholder="Optional notes…"
              className="mca-input mt-mca-sm resize-none rounded-mca-control min-h-[5rem]"
            />
          </div>
        </div>
        {metaError ? (
          <InlineError className="mt-mca-compact text-xs" showIcon>
            {metaError}
          </InlineError>
        ) : null}
        <div className="mt-mca-base flex flex-wrap items-center gap-mca-compact">
          <LoadingButton
            type="button"
            isLoading={metaSaving}
            disabled={loadingSummary || busyAction !== null || visibilityBusy}
            onClick={() => void saveDeckMetadata()}
            className="rounded-mca-control bg-mca-accent-strong/90 px-mca-base py-mca-sm text-sm font-semibold text-mca-on-accent shadow-mca-panel hover:bg-mca-accent disabled:opacity-50"
          >
            Save details
          </LoadingButton>
          <Link
            href="/decks"
            className="text-xs font-medium text-mca-accent-strong/90 underline-offset-2 hover:underline"
          >
            Deck list — create, rename, or delete decks
          </Link>
        </div>
      </div>

      <div className="mca-section-reveal rounded-mca-block border border-mca-border bg-mca-surface-elevated/95 p-mca-base shadow-mca-panel dark:border-mca-border-subtle">
        <h3 className="text-sm font-semibold text-mca-ink-strong">Deck visibility</h3>
        <p className="mt-mca-xs text-xs text-mca-ink-subtle">
          Public decks can be viewed by anyone with the link. Private decks return a forbidden page for others.
        </p>
        <label className="mt-mca-base flex cursor-pointer items-start gap-mca-compact">
          <input
            type="checkbox"
            className="mt-mca-xs size-4 rounded border-mca-field-border bg-mca-surface-elevated text-mca-accent-strong focus:ring-mca-focus/60"
            checked={isPublic}
            disabled={loadingSummary || visibilityBusy}
            onChange={(e) => void setDeckVisibility(e.target.checked)}
          />
          <span className="text-sm text-mca-ink-soft">
            <span className="font-medium">Share publicly</span>
            <span className="mt-mca-trace block text-xs text-mca-ink-subtle">
              When enabled, your deck appears at a read-only URL you can share.
            </span>
          </span>
        </label>
      </div>

      <div className="flex flex-wrap gap-mca-compact">
        <button
          type="button"
          disabled={loadingCards || busyAction !== null}
          onClick={() => setExportOpen(true)}
          className="rounded-mca-control border border-mca-border-subtle bg-mca-surface-elevated/95 px-mca-base py-mca-tight text-sm font-medium text-mca-ink-soft transition-all duration-200 ease-mca-standard hover:bg-mca-chrome/60 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-50 dark:border-mca-field-border"
        >
          Export deck
        </button>
        <button
          type="button"
          disabled={loadingCards || busyAction !== null}
          onClick={() => setImportOpen(true)}
          className="rounded-mca-control border border-mca-border-subtle bg-mca-surface-elevated/95 px-mca-base py-mca-tight text-sm font-medium text-mca-ink-soft transition-all duration-200 ease-mca-standard hover:bg-mca-chrome/60 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-50 dark:border-mca-field-border"
        >
          Import deck
        </button>
        {!isPublic ? (
          <button
            type="button"
            disabled={loadingCards || busyAction !== null || visibilityBusy}
            onClick={() => void makePublicAndCopy()}
            className="rounded-mca-control border border-mca-accent-strong/50 bg-mca-accent-strong/15 px-mca-base py-mca-tight text-sm font-medium text-mca-nav-accent transition-all duration-200 ease-mca-standard hover:bg-mca-accent-strong/25 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-50"
          >
            Share deck · Make public
          </button>
        ) : (
          <button
            type="button"
            disabled={loadingCards || busyAction !== null}
            onClick={() => void copyShareLink()}
            className="rounded-mca-control border border-mca-focus/40 bg-mca-success-surface/20 px-mca-base py-mca-tight text-sm font-medium text-mca-success-ink transition-all duration-200 ease-mca-standard hover:bg-mca-success-surface/30 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-50"
          >
            Copy share link
          </button>
        )}
      </div>

      {shareToast ? (
        <p
          className="mca-section-reveal rounded-mca-control border border-mca-focus/30 bg-mca-success-surface/25 px-mca-compact py-mca-sm text-sm text-mca-success-ink"
          role="status"
        >
          {shareToast}
        </p>
      ) : null}

      <div className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/95 p-mca-base shadow-mca-panel transition-shadow duration-200 dark:border-mca-border-subtle">
        <label
          htmlFor="deck-card-search"
          className="mca-section-reveal text-sm font-medium uppercase tracking-wide text-mca-ink-subtle"
        >
          Search your collection
        </label>
        <input
          id="deck-card-search"
          value={searchInput}
          onPointerDown={() => deckSearchInteract.start()}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Name search (debounced)…"
          className="mca-input mt-mca-sm rounded-mca-control px-mca-base py-mca-tight placeholder:text-mca-ink-subtle"
        />
        <div className="mt-mca-compact grid gap-mca-compact sm:grid-cols-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-mca-ink-subtle">
              Set
            </label>
            <select
              value={setFilter}
              onChange={(e) => setSetFilter(e.target.value)}
              className="mca-input mt-mca-sm rounded-mca-control py-mca-sm pl-mca-sm pr-mca-xl"
            >
              <option value="">All sets</option>
              {facetSets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-mca-ink-subtle">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="mca-input mt-mca-sm rounded-mca-control py-mca-sm pl-mca-sm pr-mca-xl"
            >
              <option value="">All types</option>
              {facetTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-mca-ink-subtle">
              Rarity
            </label>
            <select
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value)}
              className="mca-input mt-mca-sm rounded-mca-control py-mca-sm pl-mca-sm pr-mca-xl"
            >
              <option value="">All rarities</option>
              {facetRarities.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {searchError ? (
          <InlineError className="mt-mca-compact text-xs" showIcon>
            {searchError}
          </InlineError>
        ) : null}

        <div className="relative mt-mca-base min-h-[8rem]">
          {searchLoading ? (
            <div className="flex min-h-[8rem] flex-col items-center justify-center gap-mca-sm py-mca-xl">
              <LoadingSpinner className="size-6 text-mca-accent/90" />
              <p className="text-xs text-mca-ink-subtle">Searching cards…</p>
            </div>
          ) : searchResults.length === 0 ? (
            <p className="py-mca-section text-center text-xs text-mca-ink-subtle">
              No cards match these filters. Try clearing filters or another search.
            </p>
          ) : (
            <>
              <p className="mb-mca-compact text-[11px] text-mca-ink-subtle">
                Showing {searchResults.length} of {searchTotal} match
                {searchTotal === 1 ? "" : "es"}
              </p>
              {!enableSearchVirtual ? (
                <div className="grid grid-cols-1 gap-mca-compact sm:grid-cols-2 xl:grid-cols-3">
                  {searchResults.map((card) => (
                    <div key={card.id}>{renderSearchCard(card)}</div>
                  ))}
                </div>
              ) : (
                <div
                  ref={searchScrollRef}
                  className="max-h-[min(70vh,780px)] overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y max-md:max-h-[min(65dvh,560px)]"
                >
                  <div
                    className="relative w-full"
                    style={{
                      height: searchRowVirtualizer.getTotalSize(),
                      minHeight: searchRowVirtualizer.getTotalSize(),
                    }}
                  >
                    {searchRowVirtualizer.getVirtualItems().map((vr) => {
                      const start = vr.index * gridCols;
                      const slice = searchResults.slice(start, start + gridCols);
                      return (
                        <div
                          key={vr.key}
                          className="absolute left-0 top-0 w-full [contain:layout]"
                          style={{
                            height: `${vr.size}px`,
                            transform: `translate3d(0, ${vr.start}px, 0)`,
                          }}
                        >
                          <div
                            className="grid gap-mca-compact"
                            style={{
                              gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                            }}
                          >
                            {slice.map((card) => (
                              <div key={card.id}>{renderSearchCard(card)}</div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {searchHasMore ? (
                <div ref={loadMoreRef} className="flex justify-center py-mca-lg">
                  {searchLoadingMore ? (
                    <LoadingSpinner className="size-5 text-mca-accent/80" />
                  ) : (
                    <span className="text-[11px] text-mca-hint">Scroll for more…</span>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {error ? <InlineError className="p-mca-compact">{error}</InlineError> : null}

      <div className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/95 p-mca-base shadow-mca-panel dark:border-mca-border-subtle">
        <h3 className="mca-section-reveal text-sm font-semibold text-mca-ink-strong">
          Deck value over time
        </h3>
        <p className="mt-mca-sm text-xs text-mca-ink-subtle">
          Based on recorded price snapshots for cards in this deck.
        </p>
        {sectionErrors.price ? (
          <InlineError className="mt-mca-compact text-xs" showIcon>
            {sectionErrors.price}
          </InlineError>
        ) : null}
        <div
          className={`relative mt-mca-compact min-h-[5rem] rounded-mca-block border border-mca-border bg-mca-surface/40 p-mca-sm ${
            !loadingValue && deckValueSpark.length > 1 ? "mca-chart-reveal" : ""
          }`}
        >
          {loadingValue ? (
            <div className="flex min-h-[5rem] flex-col items-center justify-center gap-mca-sm py-mca-base">
              <LoadingSpinner className="size-6 text-mca-accent/90" />
              <p className="text-xs text-mca-ink-subtle">Loading value history…</p>
            </div>
          ) : deckValueSpark.length > 1 ? (
            <svg
              viewBox="0 0 280 72"
              className="h-20 w-full text-mca-accent"
              preserveAspectRatio="none"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d={deckValueSparkline(deckValueSpark, 280, 72)}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          ) : (
            <p className="py-mca-lg text-center text-xs text-mca-ink-subtle">
              Add price sync history to see value trends.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/95 p-mca-base shadow-mca-panel dark:border-mca-border-subtle">
        <h3 className="mca-section-reveal text-sm font-semibold text-mca-ink-strong">Legality</h3>
        {loadingSummary ? (
          <div className="mt-mca-compact flex min-h-[3rem] items-center gap-mca-sm text-xs text-mca-ink-subtle">
            <LoadingSpinner className="size-5 text-mca-accent/90" />
            Checking format legality…
          </div>
        ) : null}
        {sectionErrors.legality ? (
          <InlineError className="mt-mca-compact text-xs" showIcon>
            {sectionErrors.legality}
          </InlineError>
        ) : null}
        {legality && !loadingSummary ? (
          <div
            className={`mt-mca-compact rounded-mca-card border px-mca-base py-mca-compact transition-all duration-200 ease-out ${
              legality.legal
                ? "border-mca-success-surface-border/50 bg-mca-success-surface/25"
                : "border-mca-warning-surface-border/50 bg-mca-warning-surface/25"
            }`}
          >
            <p className="flex flex-wrap items-center gap-mca-sm text-sm font-semibold text-mca-ink-strong transition-opacity duration-200 ease-out">
              {legality.legal ? (
                <Icon src={McaIcons.ui.check} size="md" alt="" />
              ) : (
                <Icon src={McaIcons.ui.warning} size="md" alt="" />
              )}
              <span>
                Legality · <span className="capitalize">{legality.format}</span>
                {" — "}
                {legality.legal ? (
                  <span className="text-mca-success">Legal</span>
                ) : (
                  <span className="text-mca-accent-highlight">Has issues</span>
                )}
              </span>
            </p>
            {legality.issues.length > 0 ? (
              <ul className="mt-mca-sm list-inside list-disc space-y-mca-xs text-xs text-mca-ink-body">
                {legality.issues.map((issue, idx) => (
                  <li key={`${issue.card_id}-${idx}`}>
                    {issue.card_id ? (
                      <>
                        <span className="font-medium text-mca-ink-soft">{issue.name}</span>
                        {": "}
                      </>
                    ) : null}
                    {issue.reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : !loadingSummary && !sectionErrors.legality && !legality ? (
          <p className="mt-mca-sm text-xs text-mca-ink-subtle">No legality data available.</p>
        ) : null}
      </div>

      <div className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/95 p-mca-base shadow-mca-panel dark:border-mca-border-subtle">
        <h3 className="mca-section-reveal text-sm font-semibold text-mca-ink-strong">Synergy</h3>
        <p className="mt-mca-xs text-xs text-mca-ink-subtle">
          Heuristic score (0–100) from Pokémon TCG typings and catalog hints. Updates when you change the list or save deck details.
        </p>
        {sectionErrors.synergy ? (
          <InlineError className="mt-mca-compact text-xs" showIcon>
            {sectionErrors.synergy}
          </InlineError>
        ) : null}
        {synergyLoading ? (
          <div className="mt-mca-compact flex min-h-[3rem] items-center gap-mca-sm text-xs text-mca-ink-subtle">
            <LoadingSpinner className="size-5 text-mca-accent/90" />
            Computing synergy…
          </div>
        ) : (
          <div className="mt-mca-compact">
            <p className="text-3xl font-semibold tabular-nums text-mca-ink-strong">
              {synergyScore != null ? Math.round(synergyScore) : "—"}
            </p>
            <div
              className="mt-mca-sm h-2 w-full max-w-xs overflow-hidden rounded-full bg-mca-chrome"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={
                synergyScore != null
                  ? Math.min(100, Math.max(0, Math.round(synergyScore)))
                  : 0
              }
              aria-label="Synergy score"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-mca-accent-border/80 to-mca-focus-soft/70 transition-all duration-300"
                style={{
                  width: `${synergyScore != null ? Math.min(100, Math.max(0, synergyScore)) : 0}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-mca-base">
        {ZONE_META.map((meta) => {
          const zone = meta.id;
          const qty = zoneQty(zone);
          const collapsed = collapsedZones[zone];
          const rows = deckCards[zone] ?? [];

          return (
            <div
              key={zone}
              className="overflow-hidden rounded-mca-card border border-mca-border bg-mca-surface-elevated/95 shadow-mca-panel transition-all duration-200 dark:border-mca-border-subtle"
            >
              <button
                type="button"
                onClick={() => toggleZone(zone)}
                className="flex w-full items-center justify-between gap-mca-compact px-mca-base py-mca-compact text-left transition-colors hover:bg-mca-chrome/30"
              >
                <span className="flex items-center gap-mca-sm text-lg font-semibold text-mca-ink-strong">
                  <Icon src={meta.icon} size="md" alt="" />
                  {meta.label}
                  <span className="rounded-full bg-mca-chrome px-mca-sm py-mca-trace text-xs font-normal tabular-nums text-mca-ink-muted">
                    {qty} {qty === 1 ? "card" : "cards"}
                  </span>
                </span>
                <span className="flex items-center gap-mca-sm text-mca-ink-subtle">
                  {meta.hint ? (
                    <span className="hidden text-[10px] text-mca-hint sm:inline">{meta.hint}</span>
                  ) : null}
                  <span
                    className="inline-block text-sm text-mca-ink-muted transition-transform duration-200"
                    aria-hidden
                  >
                    {collapsed ? "▸" : "▾"}
                  </span>
                </span>
              </button>
              {!collapsed ? (
                <div className="mca-filter-crossfade border-t border-mca-border/80 px-mca-base py-mca-compact dark:border-mca-border-subtle/80">
                  {loadingCards ? (
                    <div className="flex items-center gap-mca-sm py-mca-xl text-sm text-mca-ink-subtle">
                      <LoadingSpinner className="size-5 text-mca-accent/90" />
                      Loading…
                    </div>
                  ) : rows.length === 0 ? (
                    <p className="py-mca-lg text-center text-xs text-mca-ink-subtle">
                      {zone === "commander"
                        ? "No Brawl Pokémon — add one for Brawl-style formats."
                        : "No cards in this section."}
                    </p>
                  ) : (
                    <ul className="space-y-mca-sm" aria-label={`${meta.label} cards`}>
                      {rows.map((row) => {
                        const slotKey = `${zone}:${row.card_id}`;
                        const borderClass = illegalCardIds.has(row.card_id)
                          ? "border-mca-error-bright/50 bg-mca-error-surface/20"
                          : "border-mca-border dark:border-mca-border-subtle";
                        return (
                          <li key={`${row.card_id}-${zone}`} className={`mca-row-reveal rounded-mca-block ${borderClass}`}>
                            <SwipeRevealActions
                              surface="deck-zone-row"
                              revealWidth={108}
                              className="shadow-mca-panel"
                              actions={
                                <div className="flex h-full min-h-[3.25rem] w-full">
                                  <button
                                    type="button"
                                    className="flex flex-1 flex-col items-center justify-center bg-mca-accent-strong/25 px-mca-micro text-[10px] font-semibold uppercase tracking-wide text-mca-nav-accent transition-colors duration-200 ease-mca-standard hover:bg-mca-accent-strong/35"
                                    onClick={() => setDetailCardId(row.card_id)}
                                  >
                                    Open
                                  </button>
                                  <button
                                    type="button"
                                    className="flex flex-1 flex-col items-center justify-center bg-mca-chrome px-mca-micro text-[10px] font-semibold uppercase tracking-wide text-mca-ink-strong transition-colors duration-200 ease-mca-standard hover:bg-mca-border-subtle"
                                    onClick={() => void removeFromZone(row.card_id, zone)}
                                  >
                                    −1
                                  </button>
                                </div>
                              }
                            >
                              <div
                                data-deck-zone-slot={slotKey}
                                tabIndex={zoneFocusKey === slotKey ? 0 : -1}
                                role="group"
                                aria-label={`${row.cards?.name ?? "Card"}, quantity ${row.quantity}`}
                                onFocus={() => setZoneFocusKey(slotKey)}
                                onKeyDown={(e) => {
                                  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
                                  e.preventDefault();
                                  const list = deckCards[zone] ?? [];
                                  const cur = list.findIndex((r) => r.card_id === row.card_id);
                                  const nextIdx = e.key === "ArrowDown" ? cur + 1 : cur - 1;
                                  if (nextIdx < 0 || nextIdx >= list.length) return;
                                  const nextRow = list[nextIdx];
                                  if (nextRow) setZoneFocusKey(`${zone}:${nextRow.card_id}`);
                                }}
                                className="flex flex-col gap-mca-sm px-mca-compact py-mca-tight outline-none transition-all duration-200 ease-out hover:-translate-y-px hover:bg-mca-chrome/40 focus-visible:ring-2 focus-visible:ring-mca-focus/60 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="min-w-0 flex-1">
                                  <DeckZoneTitleWithLongPress
                                    cardId={row.card_id}
                                    cardName={row.cards?.name ?? row.card_id}
                                    illegal={illegalCardIds.has(row.card_id)}
                                    onOpenDetail={setDetailCardId}
                                    traceId={deckId}
                                  />
                                  <p className="text-xs text-mca-ink-subtle">Quantity: {row.quantity}</p>
                                </div>
                                <div className="flex flex-wrap gap-mca-sm">
                                  <LoadingButton
                                    type="button"
                                    isLoading={isRemoveLoading(row.card_id, zone)}
                                    disabled={
                                      loadingCards ||
                                      (busyAction !== null && !isRemoveLoading(row.card_id, zone))
                                    }
                                    onClick={() => void removeFromZone(row.card_id, zone)}
                                    className="inline-flex items-center justify-center gap-mca-sm rounded-mca-control border border-mca-border-subtle px-mca-compact py-mca-sm text-xs font-medium text-mca-ink-strong transition-all duration-200 ease-mca-standard hover:bg-mca-chrome/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-50"
                                    title="Remove one copy"
                                  >
                                    <Icon src={McaIcons.ui.minus} size="sm" alt="" />
                                    −1
                                  </LoadingButton>
                                  <LoadingButton
                                    type="button"
                                    isLoading={isAddLoading(row.card_id, zone)}
                                    disabled={
                                      loadingCards ||
                                      (busyAction !== null && !isAddLoading(row.card_id, zone))
                                    }
                                    onClick={() => void addToZone(row.card_id, zone)}
                                    className="inline-flex items-center justify-center gap-mca-sm rounded-mca-control border border-mca-border-subtle px-mca-compact py-mca-sm text-xs font-medium text-mca-ink-strong transition-all duration-200 ease-mca-standard hover:bg-mca-chrome/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-50"
                                    title="Add one copy"
                                  >
                                    <Icon src={McaIcons.ui.plus} size="sm" alt="" />
                                    +1
                                  </LoadingButton>
                                  {ZONE_MOVE_TARGETS[zone].map(({ to, label }) => (
                                    <LoadingButton
                                      key={`${row.card_id}-${to}`}
                                      type="button"
                                      isLoading={isMoveLoading(row.card_id, zone, to)}
                                      disabled={
                                        loadingCards ||
                                        (busyAction !== null && !isMoveLoading(row.card_id, zone, to))
                                      }
                                      onClick={() => void moveCardBetweenZones(row.card_id, zone, to)}
                                      className="inline-flex items-center justify-center rounded-mca-control border border-mca-field-border bg-mca-surface/50 px-mca-tight py-mca-sm text-[10px] font-medium text-mca-ink-soft transition-all duration-200 ease-mca-standard hover:bg-mca-chrome/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-50"
                                    >
                                      {label}
                                    </LoadingButton>
                                  ))}
                                </div>
                              </div>
                            </SwipeRevealActions>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {sectionErrors.stats ? (
        <InlineError className="mb-mca-sm" showIcon>
          {sectionErrors.stats}
        </InlineError>
      ) : null}

      <div className="grid gap-mca-base lg:grid-cols-2">
        {loadingSummary ? (
          <div className="col-span-full flex min-h-[7rem] items-center justify-center gap-mca-compact rounded-mca-block border border-mca-border bg-mca-surface-elevated/95 p-mca-lg text-sm text-mca-ink-muted dark:border-mca-border-subtle">
            <LoadingSpinner className="size-6 shrink-0 text-mca-accent/90" />
            Loading deck stats…
          </div>
        ) : (
          <>
            <div className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/95 p-mca-base shadow-mca-panel dark:border-mca-border-subtle lg:col-span-2">
              <h3 className="mca-section-reveal text-sm font-semibold text-mca-ink-strong">Deck totals</h3>
              <div className="mt-mca-compact flex flex-wrap gap-mca-lg text-sm text-mca-ink-body">
                <p>
                  <span className="text-mca-ink-subtle">Total cards </span>
                  <span className="font-semibold tabular-nums text-mca-ink-strong">
                    {deckStats?.total_cards ?? "—"}
                  </span>
                </p>
                <p>
                  <span className="text-mca-ink-subtle">Unique </span>
                  <span className="font-semibold tabular-nums text-mca-ink-strong">
                    {deckStats?.unique_cards ?? "—"}
                  </span>
                </p>
              </div>
              <div className="mt-mca-base">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-mca-ink-subtle">
                  Type tags (energy &amp; Pokémon types)
                </p>
                <div className="mt-mca-sm">
                  <ColorIdentityBadges colors={deckStats?.color_identity ?? []} />
                </div>
              </div>
            </div>

            <DeckIntelligencePanel
              deckId={deckId}
              totalCards={deckStats?.total_cards ?? 0}
              typeDistribution={stats?.type_distribution as Record<string, number> | null | undefined}
              colorIdentity={deckStats?.color_identity ?? []}
              telemetryCtx={telemetryCtx}
            />

            <div className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/95 p-mca-base shadow-mca-panel lg:col-span-2 dark:border-mca-border-subtle">
              <h3 className="mca-section-reveal text-sm font-semibold text-mca-ink-strong">
                Supertype spread
              </h3>
              <p className="mt-mca-xs text-xs text-mca-ink-subtle">
                Counts by card supertype from the catalog (Pokémon, Trainer, Energy). Per-card Energy costs are not aggregated in this view.
              </p>
              <div className="mt-mca-compact max-w-md">
                <TypeCompositionBars dist={stats?.type_distribution as Record<string, number> | null} />
              </div>
            </div>

            <div className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/95 p-mca-base shadow-mca-panel dark:border-mca-border-subtle">
              <h3 className="mca-section-reveal text-sm font-semibold text-mca-ink-strong">
                Type distribution
              </h3>
              <div className="mt-mca-compact space-y-mca-xs text-xs text-mca-ink-body">
                {Object.entries(stats?.type_distribution ?? {}).length > 0 ? (
                  Object.entries(stats?.type_distribution ?? {}).map(([k, v]) => (
                    <p key={k}>
                      {k}: {v}
                    </p>
                  ))
                ) : (
                  <p className="text-mca-ink-subtle">No data</p>
                )}
              </div>
            </div>

            <div className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/95 p-mca-base shadow-mca-panel dark:border-mca-border-subtle">
              <h3 className="mca-section-reveal text-sm font-semibold text-mca-ink-strong">
                Rarity distribution
              </h3>
              <div className="mt-mca-compact space-y-mca-xs text-xs text-mca-ink-body">
                {Object.entries(stats?.rarity_distribution ?? {}).length > 0 ? (
                  Object.entries(stats?.rarity_distribution ?? {}).map(([k, v]) => (
                    <p key={k}>
                      {k}: {v}
                    </p>
                  ))
                ) : (
                  <p className="text-mca-ink-subtle">No data</p>
                )}
              </div>
            </div>

            <div className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/95 p-mca-base shadow-mca-panel dark:border-mca-border-subtle">
              <h3 className="mca-section-reveal text-sm font-semibold text-mca-ink-strong">
                Set distribution
              </h3>
              <div className="mt-mca-compact space-y-mca-xs text-xs text-mca-ink-body">
                {Object.entries(stats?.set_distribution ?? {}).length > 0 ? (
                  Object.entries(stats?.set_distribution ?? {}).map(([k, v]) => (
                    <p key={k}>
                      {k}: {v}
                    </p>
                  ))
                ) : (
                  <p className="text-mca-ink-subtle">No data</p>
                )}
              </div>
            </div>

            <div className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/95 p-mca-base shadow-mca-panel dark:border-mca-border-subtle">
              <h3 className="mca-section-reveal text-sm font-semibold text-mca-ink-strong">
                Estimated value
              </h3>
              <p className="mt-mca-compact text-sm text-mca-ink-soft">
                $
                {Number(
                  typeof stats?.estimated_value === "string"
                    ? stats.estimated_value
                    : (stats?.estimated_value ?? 0)
                ).toFixed(2)}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/95 p-mca-base shadow-mca-panel dark:border-mca-border-subtle">
        <h3 className="mca-section-reveal text-sm font-semibold text-mca-ink-strong">Top cards</h3>
        <div className="relative mt-mca-compact min-h-[8rem] grid gap-mca-compact sm:grid-cols-2 lg:grid-cols-5">
          {loadingSummary ? (
            <div className="col-span-full flex items-center justify-center gap-mca-sm py-mca-section text-sm text-mca-ink-subtle">
              <LoadingSpinner className="size-5 text-mca-accent/90" />
              Loading…
            </div>
          ) : (stats?.top_cards ?? []).length > 0 ? (
            (stats?.top_cards ?? []).map((card) => (
              <div
                key={card.id}
                className="mca-row-reveal rounded-mca-block border border-mca-border bg-mca-surface-elevated/40 p-mca-sm shadow-mca-panel transition-all duration-200 ease-mca-standard hover:shadow-mca-card dark:border-mca-border-subtle"
              >
                <div className="relative h-28 w-full overflow-hidden rounded-mca-control border border-mca-border bg-mca-surface dark:border-mca-border-subtle">
                  {card.image_url ? (
                    <RemoteCardThumb
                      src={card.image_url}
                      alt={card.name}
                      sizes="(max-width: 1024px) 50vw, 20vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-mca-hint">
                      No image
                    </div>
                  )}
                </div>
                <p className="mt-mca-sm truncate text-xs text-mca-ink-soft">{card.name}</p>
                <p className="text-xs text-mca-ink-subtle">
                  ${Number(card.price ?? 0).toFixed(2)}
                </p>
              </div>
            ))
          ) : (
            <p className="col-span-full text-xs text-mca-ink-subtle">No data</p>
          )}
        </div>
      </div>

      <CardDetailModal
        open={Boolean(detailCardId)}
        cardId={detailCardId}
        onClose={() => setDetailCardId(null)}
        onChanged={async () => {
          await loadInitial();
          router.refresh();
        }}
      />

      <ExportDeckModal
        open={exportOpen}
        deckId={deckId}
        onClose={() => setExportOpen(false)}
      />

      <ImportDeckModal
        open={importOpen}
        deckId={deckId}
        onClose={() => setImportOpen(false)}
        onChanged={async () => {
          await loadInitial();
          router.refresh();
        }}
      />

      <FtueOverlay storageKey="mca:ftue:deck-editor" surfaceName="deck-editor" title="Deck editor">
        <p>
          Search adds cards to Main, Side, or Commander zones. Stats and legality refresh shortly after you pause
          editing—watch the save chip above.
        </p>
      </FtueOverlay>
    </section>
  );
}
