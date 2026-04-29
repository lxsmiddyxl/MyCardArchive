"use client";

import {
  resolveTierAuraKey,
  tierEmblemAltText,
  tierEmblemTooltipCopy,
  type TierAuraKey,
} from "@/lib/tier/tier-emblem-meta";
import { cn } from "@/lib/ui/cn";
import { getTierStripPath } from "@/lib/ui/artwork-tokens";
import { TooltipSurface } from "@/mca-ui/tooltip-surface";
import Image from "next/image";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

export type TierEmblemVariant = "profile" | "catalog" | "compact";

export type TierEmblemProps = {
  tierSlug: string;
  variant?: TierEmblemVariant;
  className?: string;
  /** Override alt text (default: marketing tier codename). */
  alt?: string;
  /** Aura identity (Nova vs Apex on `elite`). */
  auraKey?: TierAuraKey;
  /** Animated aura behind the strip. Default: on for `catalog`/`profile`, off for `compact`. */
  showAura?: boolean;
  /** Hover / focus / tap tooltip. Default true. */
  showTooltip?: boolean;
  /** Extra classes on the interactive outer wrapper. */
  wrapperClassName?: string;
};

/**
 * Branded tier strip from `/public/artwork/tier/` with optional aura + tooltip.
 */
export function TierEmblem({
  tierSlug,
  variant = "catalog",
  className = "",
  alt,
  auraKey: auraKeyProp,
  showAura,
  showTooltip = true,
  wrapperClassName = "",
}: TierEmblemProps) {
  const src = getTierStripPath(tierSlug);
  const label = alt ?? tierEmblemAltText(tierSlug);
  const auraKey = resolveTierAuraKey(tierSlug, auraKeyProp);
  const effectiveShowAura = showAura ?? variant !== "compact";
  const tip = tierEmblemTooltipCopy(auraKey);
  const tipId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  const [pointerCoarse, setPointerCoarse] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setPointerCoarse(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setPinned(false);
  }, [tierSlug, auraKeyProp]);

  useEffect(() => {
    if (!pinned) return;
    const onDoc = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setPinned(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinned(false);
    };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [pinned]);

  const onRootClick = useCallback(
    (e: ReactMouseEvent) => {
      if (pointerCoarse !== true) return;
      e.stopPropagation();
      setPinned((p) => !p);
    },
    [pointerCoarse]
  );

  const onRootKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      if (pointerCoarse !== true) return;
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      setPinned((p) => !p);
    },
    [pointerCoarse]
  );

  const ariaLabel = `${tip.name} tier emblem. ${tip.description}`;

  const auraEl =
    effectiveShowAura ? (
      <div
        className={cn(
          "mca-tier-aura",
          auraKey === "ember" && "mca-tier-aura--ember",
          auraKey === "spark" && "mca-tier-aura--spark",
          (auraKey === "nova" || auraKey === "business") && "mca-tier-aura--nova",
          auraKey === "apex" && "mca-tier-aura--apex",
          variant === "compact" && "scale-95"
        )}
        aria-hidden
      />
    ) : null;

  const tooltipPanel = showTooltip ? (
    <div
      id={tipId}
      role="tooltip"
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute z-30 opacity-0 transition-[opacity,transform] duration-150 ease-mca-standard",
        "invisible -translate-y-1 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100",
        "group-focus-visible:visible group-focus-visible:translate-y-0 group-focus-visible:opacity-100",
        "group-data-[tier-tip=open]:visible group-data-[tier-tip=open]:translate-y-0 group-data-[tier-tip=open]:opacity-100",
        variant === "profile"
          ? "bottom-full left-1/2 mb-mca-sm -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0"
          : "bottom-full left-1/2 mb-mca-sm -translate-x-1/2",
        variant === "compact" && "mb-mca-xs"
      )}
    >
      <TooltipSurface className="shadow-mca-card">
        <p className="text-mca-label font-semibold text-mca-ink-strong">{tip.name}</p>
        <p className="mt-mca-xs text-mca-caption leading-snug text-mca-ink-muted">{tip.description}</p>
      </TooltipSurface>
    </div>
  ) : null;

  const interactiveShell = (inner: ReactNode) => {
    if (!showTooltip) {
      return (
        <div className={cn("relative", wrapperClassName)} ref={rootRef}>
          {inner}
        </div>
      );
    }
    return (
      <div
        ref={rootRef}
        className={cn(
          "group relative isolate outline-none",
          "focus-visible:ring-2 focus-visible:ring-mca-focus/50 focus-visible:ring-offset-2 focus-visible:ring-offset-mca-surface",
          wrapperClassName
        )}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-expanded={pointerCoarse === true ? pinned : undefined}
        aria-haspopup={pointerCoarse === true ? "dialog" : undefined}
        data-tier-tip={pinned ? "open" : undefined}
        onClick={onRootClick}
        onKeyDown={onRootKeyDown}
      >
        {inner}
        {tooltipPanel}
      </div>
    );
  };

  if (variant === "catalog") {
    return interactiveShell(
      <div
        className={cn(
          "relative aspect-[18/5] w-full max-w-md overflow-visible rounded-mca-block",
          className
        )}
      >
        {auraEl}
        <div className="relative z-[1] h-full w-full overflow-hidden rounded-mca-block ring-1 ring-mca-border-subtle/50 dark:ring-mca-border-subtle/40">
          <Image
            src={src}
            alt={label}
            fill
            className="object-cover object-center opacity-95 dark:opacity-[0.88]"
            sizes="(max-width:640px) 100vw, 360px"
          />
        </div>
      </div>
    );
  }

  const box =
    variant === "profile"
      ? "h-14 w-[min(200px,45vw)] sm:h-[3.75rem] sm:w-[220px]"
      : variant === "compact"
        ? "h-7 w-[3.75rem] min-w-[3.75rem] max-w-[4rem]"
        : "h-12 w-[min(180px,50vw)]";

  return interactiveShell(
    <div className={cn("relative", box, className)}>
      {auraEl ? (
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-visible">
          <div className={cn("relative h-[118%] w-[118%] max-w-none", variant === "compact" && "h-[112%] w-[112%]")}>
            {auraEl}
          </div>
        </div>
      ) : null}
      <div className="relative z-[1] h-full w-full">
        <Image
          src={src}
          alt={label}
          fill
          className="object-contain object-center"
          sizes="220px"
          priority={variant === "profile"}
        />
      </div>
    </div>
  );
}

export type { TierAuraKey } from "@/lib/tier/tier-emblem-meta";
