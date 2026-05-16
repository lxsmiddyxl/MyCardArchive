"use client";

import {
  BINDER_THEME_LABELS,
  getBinderTheme,
  setBinderTheme,
  type BinderThemeId,
} from "@/mca-utils/binders/binder-theme";
import { cn } from "@/lib/ui/cn";
import { useCallback, useState } from "react";

export type BinderThemeSelectorProps = {
  binderId: string;
  onThemeChange?: (theme: BinderThemeId) => void;
  className?: string;
};

const THEME_IDS: BinderThemeId[] = ["default", "dark", "holo", "set"];

export function BinderThemeSelector({
  binderId,
  onThemeChange,
  className,
}: BinderThemeSelectorProps) {
  const [theme, setTheme] = useState<BinderThemeId>(() => getBinderTheme(binderId));

  const pick = useCallback(
    (next: BinderThemeId) => {
      setBinderTheme(binderId, next);
      setTheme(next);
      onThemeChange?.(next);
    },
    [binderId, onThemeChange]
  );

  return (
    <div
      className={cn("flex flex-wrap items-center gap-mca-sm", className)}
      role="group"
      aria-label="Binder theme"
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-mca-ink-subtle">
        Theme
      </span>
      {THEME_IDS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => pick(id)}
          className={cn(
            "rounded-mca-pill border px-mca-sm py-mca-tight text-xs font-medium transition duration-200 ease-mca-standard",
            theme === id
              ? "border-mca-accent-border/50 bg-mca-accent-border/15 text-mca-accent"
              : "border-mca-border-subtle bg-mca-surface/60 text-mca-ink-muted hover:bg-mca-chrome/60"
          )}
        >
          {BINDER_THEME_LABELS[id]}
        </button>
      ))}
    </div>
  );
}
