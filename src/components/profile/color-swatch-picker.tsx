"use client";

import { cn } from "@/lib/ui/cn";

/** Curated trainer accent colors (profile `favorite_color`). */
export const TRAINER_ACCENT_SWATCHES = [
  { name: "Emerald", value: "#10b981" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Sapphire", value: "#3b82f6" },
  { name: "Rose", value: "#e11d48" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Slate", value: "#64748b" },
  { name: "Charcoal", value: "#1f2937" },
  { name: "Gold", value: "#fbbf24" },
  { name: "Electric Blue", value: "#00b3ff" },
  { name: "Neon Green", value: "#39ff14" },
] as const;

export type TrainerAccentSwatch = (typeof TRAINER_ACCENT_SWATCHES)[number];

function normalizeHex(s: string): string {
  return s.trim().toLowerCase();
}

export type ColorSwatchPickerProps = {
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
  className?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
};

/**
 * Discord-style circular swatches; `value` is a hex string (typically from the curated palette).
 */
export function ColorSwatchPicker({
  value,
  onChange,
  disabled,
  className,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
}: ColorSwatchPickerProps) {
  const current = normalizeHex(value);

  return (
    <div
      role="radiogroup"
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      className={cn("grid max-w-md grid-cols-5 gap-mca-sm sm:grid-cols-5 sm:gap-mca-md", className)}
    >
      {TRAINER_ACCENT_SWATCHES.map((swatch) => {
        const selected = current === normalizeHex(swatch.value);
        return (
          <button
            key={swatch.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${swatch.name}, ${swatch.value}`}
            title={swatch.name}
            disabled={disabled}
            onClick={() => onChange(swatch.value)}
            className={cn(
              "relative mx-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition duration-150 ease-mca-standard sm:h-12 sm:w-12",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-mca-ink-strong focus-visible:ring-offset-2 focus-visible:ring-offset-mca-chrome dark:focus-visible:ring-offset-mca-surface-elevated",
              "disabled:cursor-not-allowed disabled:opacity-40",
              selected
                ? "scale-105 border-mca-ink-strong shadow-mca-panel ring-2 ring-mca-ink-strong ring-offset-2 ring-offset-mca-chrome dark:border-mca-chrome dark:ring-offset-mca-surface-elevated"
                : "border-black/15 hover:scale-105 hover:border-mca-border-strong hover:shadow-mca-panel dark:border-white/25 dark:hover:border-mca-border-light-strong"
            )}
            style={{ backgroundColor: swatch.value }}
          />
        );
      })}
    </div>
  );
}
