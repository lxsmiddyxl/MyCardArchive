"use client";

import type { CatalogCardHit } from "@/lib/dto/catalog";
import { variantLabelFromHit } from "@/lib/catalog/variants";
import { Field } from "@/mca-ui/field";
import { cn } from "@/lib/ui/cn";

export type CardVariantSelectorProps = {
  variants: CatalogCardHit[];
  value: string;
  onChange: (hit: CatalogCardHit) => void;
  disabled?: boolean;
  className?: string;
};

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
      <select
        id="catalog-variant"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const hit = variants.find((v) => v.id === e.target.value);
          if (hit) onChange(hit);
        }}
        className={cn(
          "mca-input mt-0 w-full rounded-mca-card border border-mca-field-border bg-mca-surface px-mca-sm py-mca-sm text-sm text-mca-ink-strong transition duration-200 ease-mca-standard disabled:opacity-60"
        )}
      >
        {variants.map((v) => (
          <option key={v.id} value={v.id}>
            {variantLabelFromHit(v)}
          </option>
        ))}
      </select>
    </Field>
  );
}
