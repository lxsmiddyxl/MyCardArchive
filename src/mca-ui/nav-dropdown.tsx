"use client";

import { cn } from "@/lib/ui/cn";
import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

const NavDropdownCloseContext = createContext<(() => void) | null>(null);

/** Call from inside an open {@link NavDropdown} menu (descendant of its panel). */
export function useNavDropdownClose(): (() => void) | null {
  return useContext(NavDropdownCloseContext);
}

type NavDropdownProps = {
  /** Visible trigger (text + icon, avatar, etc.) */
  trigger: React.ReactNode;
  /** When true, trigger gets active styles */
  active?: boolean;
  /** Menu panel alignment under trigger */
  align?: "left" | "right";
  /** Optional class on the floating menu panel */
  menuClassName?: string;
  /** Optional extra classes on the trigger button */
  triggerClassName?: string;
  /** Accessible name when trigger has no text */
  ariaLabel?: string;
  children: React.ReactNode;
};

function collectMenuItems(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'));
}

export function NavDropdown({
  trigger,
  active,
  align = "left",
  menuClassName,
  triggerClassName,
  ariaLabel,
  children,
}: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const btnId = useId();
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  /** Focus first menu item when opened. */
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      collectMenuItems(menuRef.current)[0]?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  const moveFocus = useCallback((delta: number) => {
    const items = collectMenuItems(menuRef.current);
    if (items.length === 0) return;
    const activeEl = document.activeElement as HTMLElement | null;
    let idx = items.indexOf(activeEl as HTMLElement);
    if (idx < 0) idx = 0;
    else idx = (idx + delta + items.length) % items.length;
    items[idx]?.focus();
  }, []);

  const onMenuKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          moveFocus(1);
          break;
        case "ArrowUp":
          e.preventDefault();
          moveFocus(-1);
          break;
        case "Home":
          e.preventDefault();
          collectMenuItems(menuRef.current)[0]?.focus();
          break;
        case "End": {
          e.preventDefault();
          const items = collectMenuItems(menuRef.current);
          items[items.length - 1]?.focus();
          break;
        }
        default:
          break;
      }
    },
    [moveFocus]
  );

  return (
    <div ref={rootRef} className="relative inline-flex max-w-full">
      <button
        ref={triggerRef}
        id={btnId}
        type="button"
        data-active={active ? "true" : undefined}
        className={cn(
          "mca-header-toolbar-control min-w-0 max-w-full",
          open && "bg-mca-chrome/80 text-mca-ink-strong",
          triggerClassName
        )}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger}
      </button>
      {open ? (
        <NavDropdownCloseContext.Provider value={close}>
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-labelledby={btnId}
            tabIndex={-1}
            onKeyDown={onMenuKeyDown}
            className={cn(
              "absolute top-full z-[100] mt-mca-micro w-full min-w-[12rem] max-w-[min(20rem,calc(100vw-2rem))] rounded-mca-card border border-mca-border-subtle bg-mca-surface py-mca-micro shadow-mca-card",
              align === "right" ? "right-0 left-auto" : "left-0 right-auto",
              menuClassName
            )}
          >
            {children}
          </div>
        </NavDropdownCloseContext.Provider>
      ) : null}
    </div>
  );
}

type NavDropdownLinkProps = {
  href: string;
  active?: boolean;
  onNavigate?: () => void;
  children: React.ReactNode;
};

export function NavDropdownLink({
  href,
  active,
  onNavigate,
  children,
}: NavDropdownLinkProps) {
  const closeParent = useContext(NavDropdownCloseContext);
  return (
    <Link
      href={href}
      role="menuitem"
      data-active={active ? "true" : undefined}
      onClick={() => {
        closeParent?.();
        onNavigate?.();
      }}
      className={cn(
        "block rounded-mca-control px-mca-compact py-mca-sm text-sm font-medium outline-none transition-colors duration-200 ease-mca-standard",
        "text-mca-ink-soft hover:bg-mca-surface-elevated hover:text-mca-ink",
        "focus-visible:z-10 focus-visible:bg-mca-surface-elevated focus-visible:ring-2 focus-visible:ring-mca-focus/50 focus-visible:ring-offset-2 focus-visible:ring-offset-mca-surface",
        active && "bg-mca-chrome/90 text-mca-nav-accent/90"
      )}
    >
      {children}
    </Link>
  );
}
