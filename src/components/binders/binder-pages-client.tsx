"use client";

import { EmptySlotPickerModal } from "@/components/decks/empty-slot-picker-modal";
import { BinderPageNavigation } from "@/mca-ui/binder/BinderPageNavigation";
import { BinderPageView } from "@/mca-ui/binder/BinderPageView";
import { BinderThemeSelector } from "@/mca-ui/binder/BinderThemeSelector";
import { LayoutModeSelector } from "@/mca-ui/binder/LayoutModeSelector";
import { InlineError } from "@/mca-ui/inline-error";
import { LoadingSpinner } from "@/mca-ui/loading-button";
import {
  BINDER_SURFACES_REFRESH_EVENT,
  requestBinderSurfacesRefresh,
} from "@/lib/binders/binder-surfaces-refresh";
import {
  BINDER_GRID_COLS,
  BINDER_SLOTS_PER_PAGE,
} from "@/lib/binders/constants";
import { useBinderDragChrome } from "@/lib/binders/use-binder-drag-chrome";
import {
  fetchJson,
  fetchJsonErrorMessage,
  useAsyncState,
} from "@/lib/client";
import type { BinderSlotsListPayloadDTO } from "@/lib/dto/binder";
import type { LayoutMode } from "@/mca-utils/binders/autoLayout";
import { buildSlotsForPage, slotHref } from "@/mca-utils/binders/binder-page-grid";
import {
  getBinderTheme,
  getBinderThemeClasses,
  type BinderThemeId,
} from "@/mca-utils/binders/binder-theme";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

type PagesMap = Record<string, import("@/lib/dto/binder").BinderSlotDTO[]>;

type Props = {
  binderId: string;
  binderName: string;
};

export function BinderPagesClient({ binderId, binderName }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPage = Math.max(0, Number(searchParams.get("page") ?? "0") || 0);

  const [pages, setPages] = useState<PagesMap>({});
  const [page, setPage] = useState(initialPage);
  const [maxPagesAllowed, setMaxPagesAllowed] = useState(24);
  const [pageNumbers, setPageNumbers] = useState<number[]>([]);
  const [dragOver, setDragOver] = useState<{ page: number; slot: number } | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("number");
  const [themeId, setThemeId] = useState<BinderThemeId>(() => getBinderTheme(binderId));
  const [picker, setPicker] = useState<{ page: number; slot: number } | null>(null);
  const [pickerCards, setPickerCards] = useState<
    { id: string; name: string; binder_id: string; image_url: string | null; rarity: string | null }[]
  >([]);
  const [pageAnim, setPageAnim] = useState<"none" | "next" | "prev">("none");
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);

  const binderShellRef = useRef<HTMLDivElement | null>(null);
  const gridNavRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<number | null>(null);

  const loadState = useAsyncState<BinderSlotsListPayloadDTO>();
  const mutationState = useAsyncState<void>();

  const apiBase = `/api/binders/${encodeURIComponent(binderId)}`;
  const theme = useMemo(
    () => getBinderThemeClasses(themeId, binderId),
    [themeId, binderId]
  );

  const applySlotsPayload = useCallback((payload: BinderSlotsListPayloadDTO) => {
    setPages(payload.pages ?? {});
    if (payload.maxPages > 0) setMaxPagesAllowed(payload.maxPages);
    setPageNumbers(Array.isArray(payload.pageNumbers) ? payload.pageNumbers : []);
  }, []);

  const reloadSlots = useCallback(async () => {
    const r = await fetchJson<BinderSlotsListPayloadDTO>(`${apiBase}/slots/list`, {
      cache: "no-store",
    });
    if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
    applySlotsPayload(r.data);
    loadState.setData(r.data);
  }, [apiBase, applySlotsPayload, loadState]);

  useEffect(() => {
    void (async () => {
      loadState.setLoading(true);
      try {
        await reloadSlots();
      } catch (e) {
        loadState.setError(e instanceof Error ? e.message : "Failed to load binder pages");
      } finally {
        loadState.setLoading(false);
      }
    })();
  }, [binderId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = () => void reloadSlots().catch(() => undefined);
    window.addEventListener(BINDER_SURFACES_REFRESH_EVENT, handler as EventListener);
    return () => window.removeEventListener(BINDER_SURFACES_REFRESH_EVENT, handler as EventListener);
  }, [reloadSlots]);

  const runMutation = useCallback(
    async (fn: () => Promise<void>) => mutationState.run(fn),
    [mutationState]
  );

  const moveSlot = useCallback(
    async (from: { page: number; slot: number }, to: { page: number; slot: number }) => {
      await runMutation(async () => {
        const r = await fetchJson(`${apiBase}/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from, to }),
        });
        if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
        await reloadSlots();
        requestBinderSurfacesRefresh(binderId);
      });
    },
    [apiBase, binderId, reloadSlots, runMutation]
  );

  const assignCard = useCallback(
    async (pageP: number, slotIndex: number, cardId: string) => {
      await runMutation(async () => {
        const r = await fetchJson(`${apiBase}/slots/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page_number: pageP, slot_index: slotIndex, card_id: cardId }),
        });
        if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
        await reloadSlots();
        setPicker(null);
        requestBinderSurfacesRefresh(binderId);
      });
    },
    [apiBase, binderId, reloadSlots, runMutation]
  );

  const applyLayout = useCallback(
    async (mode: LayoutMode) => {
      if (mode === "custom") return;
      await runMutation(async () => {
        const r = await fetchJson(`${apiBase}/layout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode }),
        });
        if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
        await reloadSlots();
        setPage(0);
        requestBinderSurfacesRefresh(binderId);
      });
    },
    [apiBase, binderId, reloadSlots, runMutation]
  );

  const triggerPageAnim = useCallback((dir: "next" | "prev", fn: () => void) => {
    if (animRef.current) window.clearTimeout(animRef.current);
    setPageAnim(dir);
    animRef.current = window.setTimeout(() => {
      fn();
      setPageAnim("none");
      animRef.current = null;
    }, 140);
  }, []);

  const setPageAnimated = useCallback(
    (next: number) => {
      if (next === page) return;
      triggerPageAnim(next > page ? "next" : "prev", () => setPage(next));
    },
    [page, triggerPageAnim]
  );

  const canGoPrev = page > 0;
  const canGoNext = page < maxPagesAllowed - 1;

  const goPrevPage = useCallback(() => {
    if (!canGoPrev || mutationState.loading) return;
    setPageAnimated(page - 1);
  }, [canGoPrev, mutationState.loading, page, setPageAnimated]);

  const goNextPage = useCallback(() => {
    if (!canGoNext || mutationState.loading) return;
    setPageAnimated(page + 1);
  }, [canGoNext, mutationState.loading, page, setPageAnimated]);

  useBinderDragChrome({
    busy: mutationState.loading || loadState.loading,
    canGoPrev,
    canGoNext,
    onPrevPage: goPrevPage,
    onNextPage: goNextPage,
    binderShellRef,
  });

  const slotsForPage = useMemo(() => buildSlotsForPage(pages, page), [pages, page]);

  useEffect(() => {
    setActiveSlotIndex(0);
    gridNavRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [page]);

  const handleGridNavKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      const cols = BINDER_GRID_COLS;
      const total = BINDER_SLOTS_PER_PAGE;
      let next = activeSlotIndex;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const row = Math.floor(activeSlotIndex / cols);
        const col = activeSlotIndex % cols;
        if (col < cols - 1) next = row * cols + col + 1;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const row = Math.floor(activeSlotIndex / cols);
        const col = activeSlotIndex % cols;
        if (col > 0) next = row * cols + col - 1;
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (activeSlotIndex + cols < total) next = activeSlotIndex + cols;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (activeSlotIndex >= cols) next = activeSlotIndex - cols;
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const slot = slotsForPage[activeSlotIndex];
        if (!slot) return;
        if (slot.cardId) router.push(slotHref(binderId, slot, page));
        else setPicker({ page, slot: slot.slotIndex });
      } else {
        return;
      }
      setActiveSlotIndex(Math.max(0, Math.min(total - 1, next)));
    },
    [activeSlotIndex, binderId, page, router, slotsForPage]
  );

  const pageTurnClass =
    pageAnim === "next"
      ? "mca-binder-page-turn-next"
      : pageAnim === "prev"
        ? "mca-binder-page-turn-prev"
        : "";

  const busy = mutationState.loading;
  const loading = loadState.loading;
  const displayError = mutationState.error ?? loadState.error;

  useEffect(() => {
    if (!picker) return;
    void (async () => {
      const r = await fetchJson<{ cards: typeof pickerCards }>("/api/cards/list", {
        cache: "no-store",
      });
      if (r.kind !== "ok") {
        setPickerCards([]);
        return;
      }
      const all = Array.isArray(r.data.cards) ? r.data.cards : [];
      setPickerCards(
        all.filter((c) => c.binder_id === binderId) as typeof pickerCards
      );
    })();
  }, [binderId, picker]);

  return (
    <div className="space-y-mca-lg" aria-busy={loading || busy || undefined}>
      <div className="flex flex-wrap items-center justify-between gap-mca-md">
        <div>
          <h1 className="text-2xl font-semibold text-mca-ink-strong">{binderName}</h1>
          <p className="text-sm text-mca-ink-muted">9-pocket page view</p>
        </div>
        <BinderThemeSelector binderId={binderId} onThemeChange={setThemeId} />
      </div>

      {displayError ? (
        <InlineError>{displayError}</InlineError>
      ) : null}

      <LayoutModeSelector
        mode={layoutMode}
        busy={busy}
        onModeChange={setLayoutMode}
        onApply={(m) => void applyLayout(m)}
      />

      <BinderPageNavigation
        page={page}
        maxPages={maxPagesAllowed}
        storedPageNumbers={pageNumbers}
        busy={busy}
        onPageChange={setPageAnimated}
      />

      {loading ? (
        <div className="flex items-center gap-mca-sm text-sm text-mca-ink-muted">
          <LoadingSpinner className="size-5" />
          Loading pages…
        </div>
      ) : (
        <BinderPageView
          binderId={binderId}
          page={page}
          slots={slotsForPage}
          busy={busy}
          dragOver={dragOver}
          theme={theme}
          pageTurnClass={pageTurnClass}
          shellRef={binderShellRef}
          gridNavRef={gridNavRef}
          activeSlotIndex={activeSlotIndex}
          onGridKeyDown={handleGridNavKeyDown}
          onOpenSlot={(slot) => router.push(slotHref(binderId, slot, page))}
          onOpenPicker={(p, s) => setPicker({ page: p, slot: s })}
          onMove={(from, to) => void moveSlot(from, to)}
          onDragOverSlot={(p, s) => setDragOver({ page: p, slot: s })}
          onDragLeaveSlot={(p, s) =>
            setDragOver((c) => (c?.page === p && c.slot === s ? null : c))
          }
          onClearDragOver={() => setDragOver(null)}
          onActivateSlot={setActiveSlotIndex}
        />
      )}

      <EmptySlotPickerModal
        isOpen={picker !== null}
        onClose={() => setPicker(null)}
        binderId={binderId}
        cards={pickerCards}
        busy={busy}
        assigningCardId={null}
        onPick={(cardId) => {
          if (!picker) return;
          void assignCard(picker.page, picker.slot, cardId);
        }}
      />
    </div>
  );
}
