import type { CatalogCardHit } from "@/lib/dto/catalog";
import { variantLabelFromHit } from "@/lib/catalog/variants";

const GROUP_LABELS: Record<string, string> = {
  holo: "Holo",
  reverse_holo: "Reverse",
  promo: "Promo",
  alt_art: "Alt art",
  standard: "",
};

/** Short badge label for scan UI (variant group from image heuristics). */
export function variantBadgeFromGroup(variantGroup: string | null | undefined): string | null {
  const key = variantGroup?.trim().toLowerCase() ?? "";
  if (!key || key === "standard") return null;
  return GROUP_LABELS[key] ?? key.replace(/_/g, " ");
}

export function variantBadgeFromHit(hit: CatalogCardHit): string | null {
  const label = variantLabelFromHit(hit);
  if (label.length > 24) return label.slice(0, 22) + "…";
  const lower = label.toLowerCase();
  if (lower.includes("reverse")) return "Reverse";
  if (lower.includes("promo")) return "Promo";
  if (lower.includes("alt")) return "Alt art";
  if (lower.includes("holo")) return "Holo";
  return label.length <= 12 ? label : null;
}

export function variantBadgeInitials(badge: string): string {
  return badge.slice(0, 2).toUpperCase();
}
