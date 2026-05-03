"use client";

import type { ArchetypeFitRow } from "@/lib/persona/persona-v2";
import { Panel } from "@/mca-ui/panel";

export type ProfilePersonaV2PanelProps = {
  personaV2Label: string | null;
  personaV2Summary: string | null;
  topArchetypes: ArchetypeFitRow[];
};

export function ProfilePersonaV2Panel({
  personaV2Label,
  personaV2Summary,
  topArchetypes,
}: ProfilePersonaV2PanelProps) {
  if (!personaV2Label && !personaV2Summary && topArchetypes.length === 0) {
    return null;
  }

  const chips = topArchetypes.slice(0, 3);

  return (
    <Panel className="rounded-mca-card border border-mca-border/70 bg-mca-surface-elevated/40 p-mca-md shadow-inner">
      <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
        Collector style
      </p>
      {personaV2Label?.trim() ? (
        <p className="mt-mca-sm text-lg font-semibold text-mca-ink-strong">{personaV2Label.trim()}</p>
      ) : null}
      {personaV2Summary?.trim() ? (
        <p className="mt-mca-xs text-sm leading-snug text-mca-ink-muted">{personaV2Summary.trim()}</p>
      ) : null}
      {chips.length > 0 ? (
        <ul className="mt-mca-md space-y-mca-xs">
          {chips.map((a) => (
            <li
              key={a.archetype_id}
              className="flex flex-wrap items-baseline justify-between gap-mca-sm text-sm text-mca-ink-body"
            >
              <span className="font-medium text-mca-ink-strong">{a.label}</span>
              <span className="text-mca-caption text-mca-ink-muted">{a.confidence_band}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}
