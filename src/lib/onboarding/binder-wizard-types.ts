export const BINDER_WIZARD_KINDS = ["set", "custom", "trade", "showcase"] as const;

export type BinderWizardKind = (typeof BINDER_WIZARD_KINDS)[number];

export const BINDER_KIND_LABELS: Record<BinderWizardKind, string> = {
  set: "Set binder",
  custom: "Custom collection",
  trade: "Trade binder",
  showcase: "Showcase binder",
};

export function formatBinderDescription(
  kind: BinderWizardKind,
  description: string | null | undefined
): string | null {
  const label = BINDER_KIND_LABELS[kind];
  const trimmed = description?.trim() ?? "";
  if (!trimmed) return `${label}.`;
  return `${label} · ${trimmed}`;
}
