/** Phase 29 — Parsed public shape of `user_identity_map.identity` (qualitative JSON only). */

export type IdentityArchetypeBlendEntry = {
  label: string;
  band: string;
  iconKey: string | null;
};

export type IdentityMapPublic = {
  identityHeadline: string | null;
  identitySummary: string | null;
  identityTraits: string[];
  identityClusters: string[];
  identitySignals: string[];
  identityArchetypeBlend: IdentityArchetypeBlendEntry[];
  personaV2Label: string | null;
  personaV2Summary: string | null;
};

const EMPTY: IdentityMapPublic = {
  identityHeadline: null,
  identitySummary: null,
  identityTraits: [],
  identityClusters: [],
  identitySignals: [],
  identityArchetypeBlend: [],
  personaV2Label: null,
  personaV2Summary: null,
};

function readStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function readStrArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    if (typeof x === "string" && x.trim()) out.push(x.trim());
  }
  return out;
}

function readBlend(v: unknown): IdentityArchetypeBlendEntry[] {
  if (!Array.isArray(v)) return [];
  const out: IdentityArchetypeBlendEntry[] = [];
  for (const x of v) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const label = readStr(o.label);
    const band = readStr(o.band);
    if (!label || !band) continue;
    const iconKey =
      readStr(o.iconKey) ??
      (typeof o.icon_key === "string" && o.icon_key.trim() ? o.icon_key.trim() : null);
    out.push({ label, band, iconKey });
  }
  return out;
}

/** Normalizes RPC `identity` jsonb into a safe client shape (drops unknown keys). */
export function parseIdentityMapJson(raw: unknown): IdentityMapPublic {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY };
  }
  const j = raw as Record<string, unknown>;
  return {
    identityHeadline: readStr(j.identityHeadline),
    identitySummary: readStr(j.identitySummary),
    identityTraits: readStrArray(j.identityTraits),
    identityClusters: readStrArray(j.identityClusters),
    identitySignals: readStrArray(j.identitySignals),
    identityArchetypeBlend: readBlend(j.identityArchetypeBlend),
    personaV2Label: readStr(j.personaV2Label),
    personaV2Summary: readStr(j.personaV2Summary),
  };
}
