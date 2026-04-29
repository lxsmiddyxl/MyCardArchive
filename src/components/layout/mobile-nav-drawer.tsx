"use client";

import { supabaseBrowser } from "@/lib/supabase/browser";
import { McaIcons } from "@/lib/icons/mca-icons";
import type { NavLinkItem } from "@/lib/nav/nav-link-config";
import { Icon } from "@/mca-ui/icon";
import { cn } from "@/lib/ui/cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export type MobileNavSection = {
  title: string;
  items: NavLinkItem[];
};

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
  /** Top-level links (Feed, Scan, Activity, …) */
  primaryLinks: readonly NavLinkItem[];
  creator?: MobileNavSection;
  collection: MobileNavSection;
  trading: MobileNavSection;
  account: MobileNavSection;
};

const linkClass =
  "mca-nav-focus-ring block rounded-mca-block px-mca-compact py-mca-tight text-sm font-medium outline-none transition-colors duration-200 ease-mca-standard focus-visible:ring-2 focus-visible:ring-mca-focus/50 focus-visible:ring-offset-2 focus-visible:ring-offset-mca-surface";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    const style = window.getComputedStyle(el);
    return style.visibility !== "hidden" && style.display !== "none" && el.getClientRects().length > 0;
  });
}

export function MobileNavDrawer({
  open,
  onClose,
  primaryLinks,
  creator,
  collection,
  trading,
  account,
}: MobileNavDrawerProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const first =
        panelRef.current?.querySelector<HTMLElement>(
          'a[href], button:not([disabled])'
        );
      first?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const signOut = useCallback(async () => {
    onClose();
    setSigningOut(true);
    try {
      const supabase = supabaseBrowser();
      await supabase.auth.signOut();
      router.push("/auth/sign-in");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }, [router, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ease-mca-standard"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const focusables = getFocusableElements(panelRef.current);
          if (focusables.length === 0) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          const active = document.activeElement as HTMLElement | null;
          if (e.shiftKey && active === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
          }
        }}
        className="absolute left-0 top-0 flex h-full w-[min(20rem,92vw)] flex-col border-r border-mca-border bg-mca-surface shadow-mca-card transition-transform duration-200 ease-mca-standard motion-reduce:transition-none"
      >
        <div className="flex min-h-14 shrink-0 items-center justify-between border-b border-mca-border px-mca-md py-mca-compact">
          <p className="text-sm font-semibold tracking-tight text-mca-ink-strong">Menu</p>
          <button
            type="button"
            onClick={onClose}
            className="mca-nav-focus-ring inline-flex h-10 w-10 items-center justify-center rounded-mca-control text-mca-ink-muted transition-colors duration-200 ease-mca-standard hover:bg-mca-chrome hover:text-mca-ink-strong"
            aria-label="Close menu"
          >
            <Icon src={McaIcons.ui.close} size="sm" alt="" className="text-mca-ink-body" />
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-mca-md py-mca-md" aria-label="Mobile">
          <ul className="space-y-mca-trace">
            {primaryLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    linkClass,
                    "inline-flex items-center gap-mca-sm text-mca-ink-strong hover:bg-mca-surface-elevated/80 hover:text-mca-ink"
                  )}
                >
                  <Icon src={item.icon} size="sm" alt="" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {creator ? (
            <div className="mt-mca-lg border-t border-mca-border/90 pt-mca-lg">
              <SectionBlock title={creator.title} items={creator.items} onNavigate={onClose} />
            </div>
          ) : null}

          <div className="mt-mca-lg space-y-mca-lg border-t border-mca-border/90 pt-mca-lg">
            <SectionBlock title={collection.title} items={collection.items} onNavigate={onClose} />
            <SectionBlock title={trading.title} items={trading.items} onNavigate={onClose} />
            <SectionBlock title={account.title} items={account.items} onNavigate={onClose} />
          </div>

          <div className="mt-auto border-t border-mca-border/90 pt-mca-comfortable">
            <button
              type="button"
              disabled={signingOut}
              onClick={() => void signOut()}
              className="mca-nav-focus-ring inline-flex w-full items-center gap-mca-sm rounded-mca-block border border-mca-border-subtle bg-mca-surface-elevated/80 px-mca-compact py-mca-tight text-left text-sm font-semibold text-mca-ink-soft outline-none transition-all duration-200 ease-mca-standard hover:border-mca-field-border hover:bg-mca-chrome focus-visible:ring-2 focus-visible:ring-mca-focus/50 focus-visible:ring-offset-2 focus-visible:ring-offset-mca-surface disabled:opacity-50"
            >
              <Icon src={McaIcons.account.signOut} size="sm" alt="" />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}

function SectionBlock({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: NavLinkItem[];
  onNavigate: () => void;
}) {
  return (
    <section className="space-y-mca-sm" aria-label={title}>
      <h2 className="px-mca-xs text-mca-caption font-semibold uppercase tracking-wider text-mca-ink-subtle">
        {title}
      </h2>
      <ul className="space-y-mca-trace">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                linkClass,
                "inline-flex items-center gap-mca-sm text-mca-ink-body hover:bg-mca-surface-elevated hover:text-mca-ink"
              )}
            >
              <Icon src={item.icon} size="sm" alt="" />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
