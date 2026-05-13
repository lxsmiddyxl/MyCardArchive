"use client";

import {
  modalBackdropClasses,
  modalPanelClasses,
  useModalMount,
} from "@/lib/ui/use-modal-mount";
import { extractApiErrorMessage, extractApiPayload } from "@/lib/client";
import { LoadingButton, LoadingSpinner } from "@/mca-ui/loading-button";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

type BinderRow = { id: string; name: string };

type Props = {
  deckId: string;
  deckName: string;
  shareUrl: string;
  viewerIsOwner: boolean;
};

export function PublicDeckToolbar({
  deckId,
  deckName,
  shareUrl,
  viewerIsOwner,
}: Props) {
  const shareTitleId = useId();
  const binderTitleId = useId();
  const [shareOpen, setShareOpen] = useState(false);
  const [binderOpen, setBinderOpen] = useState(false);
  const shareMount = useModalMount(shareOpen, 200);
  const binderMount = useModalMount(binderOpen, 200);

  const [sessionViews, setSessionViews] = useState<number | null>(null);
  useEffect(() => {
    void fetch(`/api/public/decks/${encodeURIComponent(deckId)}/view`, {
      method: "POST",
    }).catch(() => {});
    try {
      const key = `mca_public_deck_session_${deckId}`;
      const prev = Number(sessionStorage.getItem(key) ?? "0");
      const next = Number.isFinite(prev) ? prev + 1 : 1;
      sessionStorage.setItem(key, String(next));
      setSessionViews(next);
    } catch {
      setSessionViews(null);
    }
  }, [deckId]);

  const [binders, setBinders] = useState<BinderRow[]>([]);
  const [bindersLoading, setBindersLoading] = useState(false);
  const [bindersError, setBindersError] = useState<string | null>(null);
  const [selectedBinderId, setSelectedBinderId] = useState("");
  const [copyBusy, setCopyBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const loadBinders = useCallback(async () => {
    setBindersLoading(true);
    setBindersError(null);
    try {
      const res = await fetch("/api/binders", { cache: "no-store" });
      if (res.status === 401) {
        setBindersError("Sign in to copy cards to a binder.");
        setBinders([]);
        return;
      }
      const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setBindersError(extractApiErrorMessage(raw) ?? "Could not load binders.");
        setBinders([]);
        return;
      }
      const data = extractApiPayload(raw) ?? raw;
      const list = Array.isArray(data.binders) ? (data.binders as BinderRow[]) : [];
      setBinders(list);
      if (list.length > 0 && !selectedBinderId) {
        setSelectedBinderId(list[0]!.id);
      }
    } catch {
      setBindersError("Network error.");
      setBinders([]);
    } finally {
      setBindersLoading(false);
    }
  }, [selectedBinderId]);

  useEffect(() => {
    if (binderOpen) {
      void loadBinders();
    }
  }, [binderOpen, loadBinders]);

  const socialLinks = useMemo(() => {
    const text = `Check out this deck: ${deckName}`;
    const encUrl = encodeURIComponent(shareUrl);
    const encText = encodeURIComponent(text);
    const encTitle = encodeURIComponent(deckName);
    return [
      {
        label: "Share on X",
        href: `https://twitter.com/intent/tweet?text=${encText}&url=${encUrl}`,
      },
      {
        label: "Facebook",
        href: `https://www.facebook.com/sharer/sharer.php?u=${encUrl}`,
      },
      {
        label: "Reddit",
        href: `https://www.reddit.com/submit?url=${encUrl}&title=${encTitle}`,
      },
      {
        label: "LinkedIn",
        href: `https://www.linkedin.com/sharing/share-offsite/?url=${encUrl}`,
      },
      {
        label: "Email",
        href: `mailto:?subject=${encTitle}&body=${encodeURIComponent(`${text}\n\n${shareUrl}`)}`,
      },
    ];
  }, [deckName, shareUrl]);

  const copyLink = useCallback(async () => {
    setCopyBusy(true);
    try {
      await navigator.clipboard.writeText(shareUrl);
    } finally {
      setCopyBusy(false);
    }
  }, [shareUrl]);

  const exportToBinder = useCallback(async () => {
    if (!selectedBinderId) {
      setExportMsg("Choose a binder.");
      return;
    }
    setExportBusy(true);
    setExportMsg(null);
    try {
      const res = await fetch(
        `/api/public/decks/${encodeURIComponent(deckId)}/copy-to-binder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ binder_id: selectedBinderId }),
        }
      );
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        added?: number;
      };
      if (!res.ok) {
        setExportMsg(body.error ?? "Could not copy cards.");
        return;
      }
      setExportMsg(`Added ${body.added ?? 0} card(s) to your binder.`);
      setBinderOpen(false);
    } catch {
      setExportMsg("Network error.");
    } finally {
      setExportBusy(false);
    }
  }, [deckId, selectedBinderId]);

  const btn =
    "rounded-mca-control border border-mca-border-light-strong bg-white px-mca-compact py-mca-sm text-xs font-semibold text-mca-surface-elevated shadow-mca-panel transition hover:bg-mca-surface-light dark:border-mca-field-border dark:bg-mca-chrome dark:text-mca-ink-strong dark:hover:bg-mca-border-subtle";

  return (
    <div className="flex flex-col gap-mca-compact sm:flex-row sm:flex-wrap sm:items-center">
      <button type="button" className={btn} onClick={() => setShareOpen(true)}>
        Share
      </button>
      {viewerIsOwner ? (
        <Link
          href={`/decks/${encodeURIComponent(deckId)}`}
          className={`inline-flex items-center justify-center ${btn}`}
        >
          Open in editor
        </Link>
      ) : null}
      <button
        type="button"
        className={btn}
        onClick={() => setBinderOpen(true)}
      >
        Export to binder
      </button>
      {sessionViews != null ? (
        <span className="text-[11px] text-mca-ink-subtle dark:text-mca-ink-subtle">
          Opens this session: {sessionViews}
        </span>
      ) : null}

      {shareMount.mounted ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center p-mca-base sm:items-center"
          role="presentation"
        >
          <button
            type="button"
            className={modalBackdropClasses(shareMount.animIn)}
            aria-label="Close share dialog"
            onClick={() => setShareOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={shareTitleId}
            className={modalPanelClasses(
              shareMount.animIn,
              "relative z-10 w-full max-w-md rounded-mca-card border border-mca-border-light bg-mca-surface-light p-mca-lg shadow-mca-card dark:border-mca-border-subtle dark:bg-mca-surface-elevated"
            )}
          >
            <h2
              id={shareTitleId}
              className="text-lg font-semibold text-mca-surface-elevated dark:text-mca-ink-strong"
            >
              Share deck
            </h2>
            <p className="mt-mca-xs text-sm text-mca-hint dark:text-mca-ink-muted">
              Copy the link or post to social — no tracking pixels, opens in a new tab.
            </p>
            <div className="mt-mca-base flex flex-wrap gap-mca-sm">
              <LoadingButton
                type="button"
                isLoading={copyBusy}
                onClick={() => void copyLink()}
                className="rounded-mca-control bg-mca-accent-strong/90 px-mca-base py-mca-sm text-sm font-semibold text-mca-on-accent"
              >
                Copy link
              </LoadingButton>
            </div>
            <p className="mt-mca-sm break-all text-xs text-mca-ink-subtle">{shareUrl}</p>
            <ul className="mt-mca-base grid gap-mca-sm sm:grid-cols-2">
              {socialLinks.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-mca-block border border-mca-border-light px-mca-compact py-mca-sm text-center text-xs font-medium text-mca-chrome transition hover:bg-mca-surface-paper dark:border-mca-field-border dark:text-mca-ink-soft dark:hover:bg-mca-chrome"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-mca-lg w-full rounded-mca-control border border-mca-border-light-strong py-mca-sm text-sm text-mca-border-subtle dark:border-mca-field-border dark:text-mca-ink-body"
              onClick={() => setShareOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {binderMount.mounted ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center p-mca-base sm:items-center"
          role="presentation"
        >
          <button
            type="button"
            className={modalBackdropClasses(binderMount.animIn)}
            aria-label="Close export dialog"
            onClick={() => setBinderOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={binderTitleId}
            className={modalPanelClasses(
              binderMount.animIn,
              "relative z-10 w-full max-w-md rounded-mca-card border border-mca-border-light bg-mca-surface-light p-mca-lg shadow-mca-card dark:border-mca-border-subtle dark:bg-mca-surface-elevated"
            )}
          >
            <h2
              id={binderTitleId}
              className="text-lg font-semibold text-mca-surface-elevated dark:text-mca-ink-strong"
            >
              Copy deck to binder
            </h2>
            <p className="mt-mca-xs text-sm text-mca-hint dark:text-mca-ink-muted">
              Creates collection cards from catalog links (one binder slot per deck copy). Respects your plan card limit.
            </p>
            {bindersLoading ? (
              <div className="mt-mca-base flex items-center gap-mca-sm text-sm text-mca-ink-subtle">
                <LoadingSpinner className="size-5 text-mca-accent-strong" />
                Loading binders…
              </div>
            ) : bindersError ? (
              <p className="mt-mca-base text-sm text-mca-accent-border dark:text-mca-accent-highlight">{bindersError}</p>
            ) : binders.length === 0 ? (
              <p className="mt-mca-base text-sm text-mca-hint dark:text-mca-ink-muted">
                No binders yet.{" "}
                <Link href="/binders" className="font-medium text-mca-accent-deep underline dark:text-mca-accent">
                  Create one
                </Link>
                .
              </p>
            ) : (
              <label className="mt-mca-base block text-sm text-mca-border-subtle dark:text-mca-ink-body">
                <span className="mb-mca-xs block text-xs font-semibold uppercase tracking-wide text-mca-ink-subtle">
                  Binder
                </span>
                <select
                  value={selectedBinderId}
                  onChange={(e) => setSelectedBinderId(e.target.value)}
                  className="mt-mca-xs w-full rounded-mca-control border border-mca-border-light-strong bg-white py-mca-sm pl-mca-sm pr-mca-xl text-sm dark:border-mca-field-border dark:bg-mca-surface"
                >
                  {binders.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {exportMsg ? (
              <p className="mt-mca-compact text-sm text-mca-focus-soft dark:text-mca-success-soft">{exportMsg}</p>
            ) : null}
            <div className="mt-mca-lg flex flex-col-reverse gap-mca-sm sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-mca-control border border-mca-border-light-strong px-mca-base py-mca-sm text-sm dark:border-mca-field-border"
                onClick={() => setBinderOpen(false)}
              >
                Cancel
              </button>
              <LoadingButton
                type="button"
                isLoading={exportBusy}
                disabled={binders.length === 0 || !selectedBinderId}
                onClick={() => void exportToBinder()}
                className="rounded-mca-control bg-mca-accent-strong/90 px-mca-base py-mca-sm text-sm font-semibold text-mca-on-accent"
              >
                Copy cards
              </LoadingButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
