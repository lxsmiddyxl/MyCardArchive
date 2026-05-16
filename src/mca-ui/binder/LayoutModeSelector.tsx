"use client";

import type { LayoutMode } from "@/mca-utils/binders/autoLayout";
import { cn } from "@/lib/ui/cn";
import { Button } from "@/mca-ui/button";

const MODES: { id: LayoutMode; label: string; hint: string }[] = [
  { id: "number", label: "By number", hint: "Sort by collector number" },
  { id: "rarity", label: "By rarity", hint: "Group commons → secrets" },
  { id: "set", label: "By set", hint: "Group by Pokémon set" },
  { id: "custom", label: "Custom", hint: "Keep manual placement" },
];

export type LayoutModeSelectorProps = {
  mode: LayoutMode;
  busy?: boolean;
  onModeChange: (mode: LayoutMode) => void;
  onApply: (mode: LayoutMode) => void;
  className?: string;
};

export function LayoutModeSelector({
  mode,
  busy,
  onModeChange,
  onApply,
  className,
}: LayoutModeSelectorProps) {
  return (
    <div
      className={cn(
        "space-y-mca-sm rounded-mca-card border border-mca-border-subtle/80 bg-mca-surface/40 p-mca-compact",
        className
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-mca-ink-subtle">
        Auto-layout
      </p>
      <div className="flex flex-wrap gap-mca-xs">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            title={m.hint}
            disabled={busy}
            onClick={() => onModeChange(m.id)}
            className={cn(
              "rounded-mca-pill border px-mca-sm py-mca-tight text-xs font-medium transition duration-200 ease-mca-standard",
              mode === m.id
                ? "border-mca-accent-border/50 bg-mca-accent-border/15 text-mca-accent"
                : "border-mca-border-subtle text-mca-ink-muted hover:bg-mca-chrome/50"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        disabled={busy || mode === "custom"}
        className="w-full sm:w-auto"
        onClick={() => onApply(mode)}
      >
        Apply layout
      </Button>
    </div>
  );
}
