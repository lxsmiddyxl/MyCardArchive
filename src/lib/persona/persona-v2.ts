/** Phase 28 — Persona v2 labels from qualitative archetype fits (no raw vectors, no numeric scores in UI). */

export type ArchetypeFitRow = {
  archetype_id: string;
  label: string;
  description?: string | null;
  icon_key?: string | null;
  confidence_band: string;
};

export type PersonaV2Build = {
  personaV2Label: string | null;
  personaV2Summary: string | null;
  topArchetypes: ArchetypeFitRow[];
};

const BAND_ORDER: Record<string, number> = {
  "Strong fit": 0,
  "Good fit": 1,
  "Light fit": 2,
  Emerging: 3,
};

function bandRank(band: string): number {
  return BAND_ORDER[band] ?? 9;
}

/**
 * Derives a friendly persona headline + summary from archetype RPC rows (already qualitative).
 */
export function buildPersonaV2FromArchetypes(rows: ArchetypeFitRow[]): PersonaV2Build {
  const sorted = [...rows].sort((a, b) => {
    const d = bandRank(a.confidence_band) - bandRank(b.confidence_band);
    if (d !== 0) return d;
    return a.label.localeCompare(b.label);
  });
  const top = sorted.slice(0, 3);
  const primary = sorted[0];
  const personaV2Label = primary?.label?.trim() ? primary.label.trim() : null;
  const summaryParts = top.map((r) => `${r.label} · ${r.confidence_band}`);
  const personaV2Summary = summaryParts.length > 0 ? summaryParts.join(" · ") : null;
  return {
    personaV2Label,
    personaV2Summary,
    topArchetypes: top,
  };
}

export function personaV2Label(from: PersonaV2Build): string | null {
  return from.personaV2Label;
}

export function personaV2Summary(from: PersonaV2Build): string | null {
  return from.personaV2Summary;
}
