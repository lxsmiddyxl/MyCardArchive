"use client";

import type { CatalogCardHit } from "@/lib/dto/catalog";
import { variantLabelFromHit } from "@/lib/catalog/variants";
import { Field } from "@/mca-ui/field";
import { RemoteCardThumb } from "@/mca-ui/remote-card-thumb";
import { MCA_MOTION_PANEL } from "@/lib/ui/mca-motion";
import { cn } from "@/lib/ui/cn";

export type CardVariantSelectorProps = {
  variants: CatalogCardHit[];
  value: string;
  onChange: (hit: CatalogCardHit) => void;
  disabled?: boolean;
  className?: string;
};

function VariantThumb({ hit }: { hit: CatalogCardHit }) {
  if (hit.image_url) {
    return (
      <RemoteCardThumb
        src={hit.image_url}
        alt=""
        sizes="32px"
        className="h-8 w-[23px] shrink-0 rounded-mca-control border border-mca-border object-cover"
      />
    );
  }
  return (
    <span
      className="flex h-8 w-[23px] shrink-0 items-center justify-center rounded-mca-control border border-dashed border-mca-border bg-mca-surface text-[8px] font-semibold uppercase text-mca-hint"
      aria-hidden
    >
      {variantLabelFromHit(hit).slice(0, 2)}
    </span>
  );
}

export function CardVariantSelector({
  variants,
  value,
  onChange,
  disabled,
  className,
}: CardVariantSelectorProps) {
  if (variants.length < 2) return null;

  return (
    <Field
      id="catalog-variant"
      label="Print variant"
      hint="Multiple catalog prints match this name and number — pick the correct foil or art."
      className={className}
    >
      <ul
        role="listbox"
        aria-label="Print variant"
        className={cn(
          "mt-mca-xs space-y-mca-xs overflow-hidden rounded-mca-card border border-mca-field-border",
          MCA_MOTION_PANEL
        )}
      >
        {variants.map((v) => {
          const selected = v.id === value;
          return (
            <li key={v.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={selected}
                disabled={disabled}
                onClick={() => onChange(v)}
                className={cn(
                  "flex w-full items-center gap-mca-sm px-mca-sm py-mca-tight text-left transition-all duration-200 ease-mca-standard",
                  selected
                    ? "bg-mca-accent-border/15 ring-1 ring-inset ring-mca-accent-border/40"
                    : "hover:bg-mca-surface-elevated/80"
                )}
              >
                <VariantThumb hit={v} />
                <span className="min-w-0 flex-1 truncate text-sm text-mca-ink-strong">
                  {variantLabelFromHit(v)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Field>
  );
}
