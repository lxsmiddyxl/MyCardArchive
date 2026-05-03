"use client";

import type { IdentityArchetypeBlendEntry } from "@/lib/identity/collector-identity-map";
import { Panel } from "@/mca-ui/panel";

export type ProfileIdentityMapPanelProps = {
  identityHeadline: string | null;
  identitySummary: string | null;
  identityTraits: string[];
  identityClusters: string[];
  identitySignals: string[];
  identityArchetypeBlend: IdentityArchetypeBlendEntry[];
};

export function ProfileIdentityMapPanel({
  identityHeadline,
  identitySummary,
  identityTraits,
  identityClusters,
  identitySignals,
  identityArchetypeBlend,
}: ProfileIdentityMapPanelProps) {
  const hasAny =
    (identityHeadline?.trim() ?? "") !== "" ||
    (identitySummary?.trim() ?? "") !== "" ||
    identityTraits.length > 0 ||
    identityClusters.length > 0 ||
    identitySignals.length > 0 ||
    identityArchetypeBlend.length > 0;

  if (!hasAny) {
    return null;
  }

  const traitChips = identityTraits.slice(0, 8);
  const clusters = identityClusters.slice(0, 5);
  const signals = identitySignals.slice(0, 4);
  const blend = identityArchetypeBlend.slice(0, 3);

  return (
    <Panel className="rounded-mca-card border border-mca-border/70 bg-mca-surface/35 p-mca-md shadow-inner">
      <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
        Collector identity map
      </p>
      {identityHeadline?.trim() ? (
        <p className="mt-mca-sm text-lg font-semibold text-mca-ink-strong">{identityHeadline.trim()}</p>
      ) : null}
      {identitySummary?.trim() ? (
        <p className="mt-mca-xs text-sm leading-relaxed text-mca-ink-muted">{identitySummary.trim()}</p>
      ) : null}
      {traitChips.length > 0 ? (
        <div className="mt-mca-md flex flex-wrap gap-mca-xs">
          {traitChips.map((t) => (
            <span
              key={t}
              className="inline-flex rounded-full border border-mca-border/70 bg-mca-surface-elevated/40 px-mca-sm py-mca-trace text-mca-caption text-mca-ink-body"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
      {clusters.length > 0 ? (
        <ul className="mt-mca-md space-y-mca-trace text-sm text-mca-ink-body">
          {clusters.map((c) => (
            <li key={c} className="flex items-start gap-mca-xs">
              <span aria-hidden className="mt-mca-micro h-1.5 w-1.5 shrink-0 rounded-full bg-mca-accent-strong/70" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {signals.length > 0 ? (
        <ul className="mt-mca-md space-y-mca-xs border-t border-mca-border/50 pt-mca-md text-mca-caption leading-snug text-mca-ink-subtle">
          {signals.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      ) : null}
      {blend.length > 0 ? (
        <div className="mt-mca-md border-t border-mca-border/50 pt-mca-md">
          <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
            Archetype blend
          </p>
          <ul className="mt-mca-sm space-y-mca-xs">
            {blend.map((a) => (
              <li key={`${a.label}-${a.band}`} className="flex flex-wrap items-baseline justify-between gap-mca-sm text-sm">
                <span className="font-medium text-mca-ink-strong">{a.label}</span>
                <span className="text-mca-caption text-mca-ink-muted">{a.band}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  );
}
