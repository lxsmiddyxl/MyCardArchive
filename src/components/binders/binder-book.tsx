"use client";

import { BinderGridRow } from "@/components/binders/binder-grid-row";
import { CardDetailModal } from "@/components/cards/card-detail-modal";
import { EmptySlotPickerModal } from "@/components/decks/empty-slot-picker-modal";
import { Icon } from "@/mca-ui/icon";
import { InlineError } from "@/mca-ui/inline-error";
import { LoadingSpinner } from "@/mca-ui/loading-button";
import {
  BINDER_GRID_COLS,
  BINDER_SLOTS_PER_PAGE,
} from "@/lib/binders/constants";
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
  presenceBinderViewer,
  subscribeToPresence,
} from "@/lib/realtime/channels";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useListRenderStats, useSuspenseProfile } from "@/lib/telemetry";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SlotCard = {
  id: string;
  name: string;
  image_url: string | null;
  image_front_thumb_url?: string | null;
  rarity: string | null;
  number: string | null;
  binder_id: string;
};

type SlotRow = {
  id: string;
  binder_id: string;
  page_number: number;
  slot_index: number;
  card_id: string | null;
  created_at: string;
  card: SlotCard | null;
};

type PagesMap = Record<string, SlotRow[]>;

type OwnedCard = {
  id: string;
  name: string;
  binder_id: string;
  image_url: string | null;
  rarity: string | null;
};

type Props = {
  binderId: string;
};

export function BinderBook({ binderId }: Props) {
  const [pages, setPages] = useState<PagesMap>({});
  const [page, setPage] = useState(0);
  const [maxPagesAllowed, setMaxPagesAllowed] = useState(24);
  const [pageNumbers, setPageNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [assigningCardId, setAssigningCardId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{ page: number; slot: number } | null>(
    null
  );
  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ page: number; slot: number } | null>(
    null
  );
  const [pickerCards, setPickerCards] = useState<OwnedCard[]>([]);
  const [pageAnim, setPageAnim] = useState<"none" | "next" | "prev">("none");
  const animRef = useRef<number | null>(null);
  const [binderPresencePeers, setBinderPresencePeers] = useState(0);
  const binderConflictLogged = useRef(false);

  const telemetryCtx = useMemo(
    () => ({
      componentName: "BinderBook",
      surfaceName: "binder-viewer",
    }),
    []
  );
  useSuspenseProfile("binder-book", telemetryCtx);

  useEffect(() => {
    const topic = presenceBinderViewer(binderId);
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
          binder_id: binderId,
          surface: "binder_viewer",
        });
      } catch {
        /* realtime unavailable */
      }
      unsub = subscribeToPresence(topic, {
        onSync: () => {
          const n = getPresenceMemberCountSync(topic);
          const peers = Math.max(0, n - 1);
          setBinderPresencePeers(peers);
          if (peers > 0 && !binderConflictLogged.current) {
            binderConflictLogged.current = true;
            mcaLog.event(
              "presence.conflict",
              { surface: "binder-viewer", peers, binderId },
              telemetryCtx
            );
          }
          if (peers === 0) binderConflictLogged.current = false;
        },
      });
    })();
    return () => {
      cancelled = true;
      unsub?.();
      void leavePresence(topic);
    };
  }, [binderId, telemetryCtx]);

  const apiBase = `/api/binders/${encodeURIComponent(binderId)}`;

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/slots/list`, { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as {
        pages?: PagesMap;
        maxPages?: number;
        pageNumbers?: number[];
        error?: string;
      };
      if (!res.ok) throw new Error(body.error ?? "Failed to load binder slots");
      const pages = body.pages ?? {};
      setPages(pages);
      if (typeof body.maxPages === "number" && body.maxPages > 0) {
        setMaxPagesAllowed(body.maxPages);
      }
      const nums = Array.isArray(body.pageNumbers) ? body.pageNumbers : [];
      setPageNumbers(nums);
      lkgSet(LKG_KEY.binderSlots(binderId), {
        pages,
        maxPages:
          typeof body.maxPages === "number" && body.maxPages > 0
            ? body.maxPages
            : undefined,
        pageNumbers: nums,
      });
    } catch (e) {
      const snap = lkgGet<{
        pages?: PagesMap;
        maxPages?: number;
        pageNumbers?: number[];
      }>(LKG_KEY.binderSlots(binderId));
      if (snap?.pages && Object.keys(snap.pages).length > 0) {
        setPages(snap.pages);
        if (typeof snap.maxPages === "number" && snap.maxPages > 0) {
          setMaxPagesAllowed(snap.maxPages);
        }
        if (Array.isArray(snap.pageNumbers)) {
          setPageNumbers(snap.pageNumbers);
        }
        mcaLog.event(
          "offline.lkg.restore",
          { surface: "binder-detail", key: "binder-slots" },
          telemetryCtx
        );
        setError(
          "You're offline or the network failed — showing the last loaded binder pages."
        );
      } else {
        setError(e instanceof Error ? e.message : "Failed to load binder");
      }
    } finally {
      setLoading(false);
    }
  }, [apiBase, binderId, telemetryCtx]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const maxPageFromData = useMemo(() => {
    const keys = Object.keys(pages)
      .map((k) => parseInt(k, 10))
      .filter((n) => Number.isFinite(n));
    return keys.length > 0 ? Math.max(...keys) : 0;
  }, [pages]);

  const canGoNext = page < maxPagesAllowed - 1;
  const canGoPrev = page > 0;

  const slotsForPage = useMemo(() => {
    const list = pages[String(page)] ?? [];
    return Array.from({ length: BINDER_SLOTS_PER_PAGE }, (_, slotIndex) => {
      const row = list.find((s) => s.slot_index === slotIndex) ?? null;
      if (row?.card) {
        return {
          slotIndex,
          cardId: row.card_id,
          card: {
            id: row.card.id,
            name: row.card.name,
            image_url: row.card.image_url,
            image_front_thumb_url: row.card.image_front_thumb_url ?? null,
          },
        };
      }
      if (row) {
        return { slotIndex, cardId: row.card_id, card: null };
      }
      return { slotIndex, cardId: null, card: null };
    });
  }, [pages, page]);

  useListRenderStats("binder-slots-page", slotsForPage.length, telemetryCtx);

  const slotRows = useMemo(() => {
    const rows: (typeof slotsForPage)[] = [];
    for (let i = 0; i < slotsForPage.length; i += BINDER_GRID_COLS) {
      rows.push(slotsForPage.slice(i, i + BINDER_GRID_COLS));
    }
    return rows;
  }, [slotsForPage]);

  const triggerPageAnim = useCallback((dir: "next" | "prev", fn: () => void) => {
    if (animRef.current) window.clearTimeout(animRef.current);
    setPageAnim(dir);
    animRef.current = window.setTimeout(() => {
      fn();
      setPageAnim("none");
      animRef.current = null;
    }, 140);
  }, []);

  const goPrevPage = useCallback(() => {
    if (page <= 0 || busy) return;
    triggerPageAnim("prev", () => setPage((p) => Math.max(0, p - 1)));
  }, [page, busy, triggerPageAnim]);

  const goNextPage = useCallback(() => {
    if (busy || page >= maxPagesAllowed - 1) return;
    triggerPageAnim("next", () =>
      setPage((p) => Math.min(maxPagesAllowed - 1, p + 1))
    );
  }, [busy, maxPagesAllowed, page, triggerPageAnim]);

  const onOpenDetail = useCallback((cardId: string) => {
    setDetailCardId(cardId);
  }, []);

  const openPicker = useCallback(
    async (pageNum: number, slotIndex: number) => {
      setPicker({ page: pageNum, slot: slotIndex });
      try {
        const res = await fetch("/api/cards/list", { cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as {
          cards?: Array<{
            id: string;
            name: string;
            binder_id: string;
            image_url: string | null;
            rarity: string | null;
          }>;
        };
        if (!res.ok) {
          setPickerCards([]);
          return;
        }
        const all = Array.isArray(body.cards) ? body.cards : [];
        setPickerCards(
          all.filter((c) => c.binder_id === binderId).map((c) => ({
            id: c.id,
            name: c.name,
            binder_id: c.binder_id,
            image_url: c.image_url,
            rarity: c.rarity,
          }))
        );
      } catch {
        setPickerCards([]);
      }
    },
    [binderId]
  );

  const onOpenPicker = useCallback(
    (pageNum: number, slotIndex: number) => {
      void openPicker(pageNum, slotIndex);
    },
    [openPicker]
  );

  const moveSlot = useCallback(
    async (from: { page: number; slot: number }, to: { page: number; slot: number }) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`${apiBase}/slots/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from, to }),
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(body.error ?? "Move failed");
        await loadSlots();
      } catch (e) {
        if (isLikelyOfflineError(e)) {
          enqueueOfflineAction({ kind: "binder_slot_move", binderId, from, to });
          setError("Offline — slot move queued to retry when you are back online.");
          mcaLog.event(
            "mobile.offline.queue",
            { kind: "binder_slot_move", op: "enqueue" },
            telemetryCtx
          );
        } else {
          setError(e instanceof Error ? e.message : "Move failed");
        }
      } finally {
        setBusy(false);
      }
    },
    [apiBase, binderId, loadSlots, telemetryCtx]
  );

  useEffect(() => {
    const flush = async () => {
      const pending = listOfflineActions().filter(
        (a) => a.kind === "binder_slot_move" && a.binderId === binderId
      );
      for (const p of pending) {
        if (p.kind !== "binder_slot_move") continue;
        try {
          const res = await fetch(`${apiBase}/slots/move`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ from: p.from, to: p.to }),
          });
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          if (res.ok) {
            finalizeOfflineAction(p.id, "synced");
            mcaLog.event(
              "mobile.offline.queue",
              { kind: "binder_slot_move", op: "flush_ok", id: p.id },
              telemetryCtx
            );
            await loadSlots();
          } else if (body.error) {
            break;
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
  }, [apiBase, binderId, loadSlots, telemetryCtx]);

  const onMove = useCallback(
    (from: { page: number; slot: number }, to: { page: number; slot: number }) => {
      void moveSlot(from, to);
    },
    [moveSlot]
  );

  const assignCard = useCallback(
    async (pageP: number, slotIndex: number, cardId: string | null) => {
      if (cardId) setAssigningCardId(cardId);
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`${apiBase}/slots/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page_number: pageP,
            slot_index: slotIndex,
            card_id: cardId,
          }),
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(body.error ?? "Update failed");
        await loadSlots();
        setPicker(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed");
      } finally {
        setBusy(false);
        setAssigningCardId(null);
      }
    },
    [apiBase, loadSlots]
  );

  const onDragOverSlot = useCallback((p: number, s: number) => {
    setDragOver({ page: p, slot: s });
  }, []);

  const onDragLeaveSlot = useCallback((p: number, s: number) => {
    setDragOver((cur) => (cur?.page === p && cur?.slot === s ? null : cur));
  }, []);

  const onClearDragOver = useCallback(() => {
    setDragOver(null);
  }, []);

  const onDetailChanged = useCallback(async () => {
    await loadSlots();
  }, [loadSlots]);

  const onPickCard = useCallback(
    (cardId: string) => {
      if (!picker) return;
      void assignCard(picker.page, picker.slot, cardId);
    },
    [picker, assignCard]
  );

  const addPage = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/pages/add`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        page_number?: number;
      };
      if (!res.ok) throw new Error(body.error ?? "Could not add page");
      await loadSlots();
      if (typeof body.page_number === "number") {
        setPage(body.page_number);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add page");
    } finally {
      setBusy(false);
    }
  }, [apiBase, loadSlots]);

  const removeCurrentPage = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/pages/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_number: page }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not remove page");
      await loadSlots();
      setPage((p) => {
        if (p > page) return p - 1;
        if (p === page) return Math.max(0, page - 1);
        return p;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove page");
    } finally {
      setBusy(false);
    }
  }, [apiBase, loadSlots, page]);

  const swapWithNext = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/pages/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_a: page, page_b: page + 1 }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not reorder pages");
      await loadSlots();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reorder pages");
    } finally {
      setBusy(false);
    }
  }, [apiBase, loadSlots, page]);

  const storedPageCount = pageNumbers.length;
  const canRemovePage = storedPageCount > 1;
  const canSwapForward = pageNumbers.includes(page + 1);

  const pageTurnClass =
    pageAnim === "next"
      ? "mca-binder-page-turn-next"
      : pageAnim === "prev"
        ? "mca-binder-page-turn-prev"
        : "";

  return (
    <div className="space-y-mca-lg">
      {error ? (
        <InlineError className="px-mca-base py-mca-compact">{error}</InlineError>
      ) : null}

      {binderPresencePeers > 0 ? (
        <p
          className="rounded-mca-card border border-mca-warning-surface-border/50 bg-mca-warning-surface/20 px-mca-base py-mca-sm text-sm text-mca-nav-accent"
          role="status"
        >
          Another session is viewing this binder ({binderPresencePeers} other
          {binderPresencePeers === 1 ? " viewer" : " viewers"}). Edits elsewhere may race—refresh
          if something looks off.
        </p>
      ) : null}

      <div className="mt-mca-sm flex flex-wrap items-center justify-between gap-mca-compact rounded-mca-card border border-mca-border bg-mca-surface-elevated/90 px-mca-base py-mca-compact shadow-mca-panel dark:border-mca-border-subtle">
        <div className="flex flex-wrap items-center gap-mca-sm">
          <span className="inline-flex items-center gap-mca-sm pr-mca-sm text-sm font-semibold text-mca-ink-body">
            <Icon src={McaIcons.collection.binder} size="md" alt="" />
            Binder
          </span>
          <button
            type="button"
            disabled={!canGoPrev || busy}
            onClick={goPrevPage}
            className="inline-flex items-center gap-mca-micro rounded-mca-block border border-mca-border-subtle bg-mca-surface/80 px-mca-compact py-mca-sm text-sm font-medium text-mca-ink-soft shadow-mca-panel transition duration-200 ease-mca-standard hover:border-mca-field-border hover:bg-mca-chrome/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.98] disabled:opacity-40"
          >
            <Icon src={McaIcons.collection.arrowLeft} size="md" alt="" />
            Prev
          </button>
          <button
            type="button"
            disabled={!canGoNext}
            onClick={goNextPage}
            className="inline-flex items-center gap-mca-micro rounded-mca-block border border-mca-border-subtle bg-mca-surface/80 px-mca-compact py-mca-sm text-sm font-medium text-mca-ink-soft shadow-mca-panel transition duration-200 ease-mca-standard hover:border-mca-field-border hover:bg-mca-chrome/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.98] disabled:opacity-40"
          >
            Next
            <Icon src={McaIcons.collection.arrowRight} size="md" alt="" />
          </button>
        </div>
        <p className="text-sm text-mca-ink-muted">
          Page{" "}
          <span className="font-semibold tabular-nums text-mca-ink-strong">
            {page + 1}
          </span>
          <span className="text-mca-hint"> / </span>
          <span className="tabular-nums text-mca-ink-subtle">{maxPagesAllowed} max</span>
        </p>
        <div className="flex flex-wrap gap-mca-sm">
          <button
            type="button"
            disabled={busy}
            onClick={() => void addPage()}
            className="rounded-mca-block border border-mca-accent-deep/50 bg-mca-warning-surface/30 px-mca-compact py-mca-sm text-xs font-semibold text-mca-nav-accent transition hover:bg-mca-warning-surface-border/40 disabled:opacity-50"
          >
            Add page
          </button>
          <button
            type="button"
            disabled={busy || !canRemovePage}
            onClick={() => void removeCurrentPage()}
            className="rounded-mca-block border border-mca-border-subtle bg-mca-surface/60 px-mca-compact py-mca-sm text-xs font-medium text-mca-ink-body transition hover:bg-mca-chrome/60 disabled:opacity-40"
            title={
              canRemovePage
                ? "Remove this page and shift later pages"
                : "Need at least two stored pages to remove"
            }
          >
            Remove page
          </button>
          <button
            type="button"
            disabled={busy || !canSwapForward}
            onClick={() => void swapWithNext()}
            className="rounded-mca-block border border-mca-border-subtle bg-mca-surface/60 px-mca-compact py-mca-sm text-xs font-medium text-mca-ink-body transition hover:bg-mca-chrome/60 disabled:opacity-40"
            title="Swap this page with the next"
          >
            Swap with next
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-mca-ink-subtle">Loading binder pages…</p>
      ) : (
        <div className="relative mx-auto max-w-4xl">
          {/* binder spine / gutter */}
          <div
            className="pointer-events-none absolute inset-y-4 left-1/2 z-0 w-px -translate-x-1/2 bg-gradient-to-b from-mca-border-subtle/20 via-mca-field-border/70 to-mca-border-subtle/20 shadow-[2px_0_12px_rgba(0,0,0,0.35)]"
            aria-hidden
          />
          <div className="relative z-[1] flex justify-center gap-0">
            <button
              type="button"
              aria-label="Previous page"
              disabled={!canGoPrev || busy}
              onClick={goPrevPage}
              className="group relative hidden w-8 shrink-0 rounded-l-xl border border-r-0 border-mca-border bg-gradient-to-r from-mca-surface-elevated/90 to-mca-surface/40 py-[min(40vh,12rem)] text-mca-hint transition hover:bg-mca-chrome/50 hover:text-mca-ink-body disabled:opacity-30 sm:block"
            >
              <span className="absolute inset-y-0 left-1 flex items-center text-lg">
                ‹
              </span>
            </button>

            <div
              className={`binder-page-shell relative min-w-0 flex-1 overflow-hidden rounded-mca-card border border-mca-border/90 bg-gradient-to-br from-mca-surface-elevated via-mca-surface to-mca-surface p-mca-lg shadow-[6px_8px_28px_-6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04)] dark:border-mca-border-subtle ${pageTurnClass}`}
            >
              {busy ? (
                <div
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-mca-compact rounded-mca-card bg-mca-surface/65 backdrop-blur-[1px]"
                  role="status"
                  aria-live="polite"
                >
                  <LoadingSpinner className="size-8 text-mca-accent" />
                  <p className="text-sm text-mca-ink-body">Updating binder…</p>
                </div>
              ) : null}

              {/* subtle right-edge “page thickness” */}
              <div
                className="pointer-events-none absolute inset-y-3 right-2 w-2 rounded-sm bg-gradient-to-l from-black/35 to-transparent"
                aria-hidden
              />

              <button
                type="button"
                aria-label="Previous page hot zone"
                disabled={!canGoPrev || busy}
                onClick={goPrevPage}
                className="absolute inset-y-6 left-0 z-[2] w-[12%] max-w-[3rem] rounded-r-md bg-gradient-to-r from-black/25 to-transparent opacity-0 transition hover:opacity-100 disabled:pointer-events-none disabled:opacity-0"
              />
              <button
                type="button"
                aria-label="Next page hot zone"
                disabled={busy || !canGoNext}
                onClick={goNextPage}
                className="absolute inset-y-6 right-0 z-[2] w-[12%] max-w-[3rem] rounded-l-md bg-gradient-to-l from-black/25 to-transparent opacity-0 transition hover:opacity-100 disabled:pointer-events-none disabled:opacity-0"
              />

              <div
                className="relative z-[1] grid gap-mca-md"
                style={{
                  gridTemplateColumns: `repeat(${BINDER_GRID_COLS}, minmax(0, 1fr))`,
                }}
              >
                {slotRows.map((rowSlots, ri) => (
                  <BinderGridRow
                    key={`${page}-r-${ri}`}
                    rowKey={`${page}-r-${ri}`}
                    slots={rowSlots.map(({ slotIndex, cardId, card }) => ({
                      page,
                      slotIndex,
                      cardId,
                      card,
                      busy,
                      isDragOver:
                        dragOver?.page === page && dragOver?.slot === slotIndex,
                      onOpenDetail,
                      onOpenPicker,
                      onMove,
                      onDragOverSlot,
                      onDragLeaveSlot,
                      onClearDragOver,
                    }))}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              aria-label="Next page"
              disabled={busy || !canGoNext}
              onClick={goNextPage}
              className="group relative hidden w-8 shrink-0 rounded-r-xl border border-l-0 border-mca-border bg-gradient-to-l from-mca-surface-elevated/90 to-mca-surface/40 py-[min(40vh,12rem)] text-mca-hint transition hover:bg-mca-chrome/50 hover:text-mca-ink-body disabled:opacity-30 sm:block"
            >
              <span className="absolute inset-y-0 right-1 flex items-center text-lg">
                ›
              </span>
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-mca-ink-subtle">
        Drag cards or empty slots between positions (including other pages). Click
        a card for details; click empty space to assign. Use{" "}
        <strong className="font-medium text-mca-ink-muted">Add page</strong> to create a
        new 9-slot spread (tier limits apply).
      </p>

      <CardDetailModal
        open={Boolean(detailCardId)}
        cardId={detailCardId}
        onClose={() => setDetailCardId(null)}
        onChanged={onDetailChanged}
      />

      <EmptySlotPickerModal
        isOpen={picker !== null}
        onClose={() => setPicker(null)}
        binderId={binderId}
        cards={pickerCards}
        busy={busy}
        assigningCardId={assigningCardId}
        onPick={onPickCard}
      />
    </div>
  );
}
