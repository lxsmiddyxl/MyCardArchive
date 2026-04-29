"use client";

import { McaIcons } from "@/lib/icons/mca-icons";
import { Icon } from "@/mca-ui/icon";
import { MODAL_MOTION_EASE, useModalMount } from "@/lib/ui/use-modal-mount";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";

let scrollLockCount = 0;
let previousOverflow = "";
let previousPaddingRight = "";

function lockBodyScroll() {
  if (typeof document === "undefined") return () => {};
  if (scrollLockCount === 0) {
    previousOverflow = document.body.style.overflow;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    if (gap > 0) {
      previousPaddingRight = document.body.style.paddingRight;
      document.body.style.paddingRight = `${gap}px`;
    } else {
      previousPaddingRight = "";
    }
    document.body.style.overflow = "hidden";
  }
  scrollLockCount += 1;
  return () => {
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount === 0) {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    }
  };
}

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return nodes.filter((node) => {
    const style = window.getComputedStyle(node);
    if (style.visibility === "hidden" || style.display === "none") return false;
    return node.getClientRects().length > 0;
  });
}

export type ModalBaseProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Visible dialog title; sets aria-labelledby. */
  title?: string;
  /** Required when title is omitted (aria-label on dialog). */
  ariaLabel?: string;
  /** Optional description id for aria-describedby */
  descriptionId?: string;
  panelClassName?: string;
  bodyClassName?: string;
  footer?: ReactNode;
  /** Mobile-friendly bottom alignment; sm+ centers. */
  align?: "center" | "end";
  zClassName?: string;
  /** When true, Escape, backdrop, and header close do nothing. */
  blockClose?: boolean;
  /** Close button aria-label */
  closeButtonAriaLabel?: string;
};

export function ModalBase({
  isOpen,
  onClose,
  children,
  title,
  ariaLabel,
  descriptionId,
  panelClassName = "",
  bodyClassName = "",
  footer,
  align = "center",
  zClassName = "z-[100]",
  blockClose = false,
  closeButtonAriaLabel = "Close dialog",
}: ModalBaseProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const { mounted, animIn } = useModalMount(isOpen, 200);

  useLayoutEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
    }
  }, [isOpen]);

  useLayoutEffect(() => {
    if (mounted) return;
    const el = triggerRef.current;
    triggerRef.current = null;
    if (el && typeof el.focus === "function") {
      el.focus();
    }
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    return lockBodyScroll();
  }, [mounted]);

  useEffect(() => {
    if (!mounted || blockClose) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [mounted, blockClose, onClose]);

  useEffect(() => {
    if (!mounted || !animIn || !panelRef.current) return;
    const panel = panelRef.current;
    const id = window.setTimeout(() => {
      const bodyRoot = panel.querySelector<HTMLElement>("[data-modal-body]");
      const bodyFocusables = bodyRoot ? getFocusableElements(bodyRoot) : [];
      if (bodyFocusables.length > 0) {
        bodyFocusables[0]!.focus();
        return;
      }
      const list = getFocusableElements(panel);
      if (list.length > 0) list[0]!.focus();
      else panel.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [mounted, animIn]);

  const onKeyDownTrap = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !panelRef.current) return;
    const list = getFocusableElements(panelRef.current);
    if (list.length === 0) return;
    const first = list[0]!;
    const last = list[list.length - 1]!;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  const tryClose = useCallback(() => {
    if (!blockClose) onClose();
  }, [blockClose, onClose]);

  if (!mounted) return null;

  if (!title && !ariaLabel) {
    throw new Error("ModalBase requires title or ariaLabel for accessibility.");
  }

  const alignClass =
    align === "end" ? "items-end justify-center sm:items-center" : "items-center justify-center";

  return (
    <div className={`fixed inset-0 flex p-mca-md ${alignClass} ${zClassName}`} role="presentation">
      <button
        type="button"
        tabIndex={-1}
        className={`absolute inset-0 bg-black/65 backdrop-blur-[2px] transition-opacity duration-200 ${MODAL_MOTION_EASE} ${
          animIn ? "opacity-100" : "opacity-0"
        }`}
        aria-label="Close dialog"
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          tryClose();
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onKeyDown={onKeyDownTrap}
        className={`relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-mca-card border border-mca-border bg-mca-surface-elevated/95 shadow-mca-card outline-none transition-all duration-200 ${MODAL_MOTION_EASE} ${
          animIn ? "scale-100 opacity-100" : "scale-[0.97] opacity-0"
        } ${panelClassName}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className={`flex shrink-0 items-center gap-mca-compact border-b border-mca-border px-mca-lg py-mca-md ${
            title ? "justify-between" : "justify-end"
          }`}
        >
          {title ? (
            <h2 id={titleId} className="mca-section-reveal text-lg font-semibold text-mca-ink-strong">
              {title}
            </h2>
          ) : (
            <span id={titleId} className="sr-only">
              {ariaLabel}
            </span>
          )}
          <button
            type="button"
            onClick={tryClose}
            disabled={blockClose}
            aria-label={closeButtonAriaLabel}
            className="inline-flex items-center justify-center gap-mca-sm rounded-mca-control border border-mca-border-subtle bg-mca-surface-elevated/80 px-mca-compact py-mca-sm text-xs font-medium text-mca-ink-soft transition-all duration-200 ease-mca-standard hover:bg-mca-chrome/60 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon src={McaIcons.ui.close} size="sm" alt="" className="shrink-0" />
            <span>Close</span>
          </button>
        </div>
        <div
          data-modal-body
          className={`min-h-0 flex-1 overflow-y-auto ${bodyClassName}`}
        >
          {children}
        </div>
        {footer ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-mca-compact border-t border-mca-border p-mca-md">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
