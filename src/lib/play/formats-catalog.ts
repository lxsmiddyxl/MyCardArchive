export type PlayFormatDef = {
  formatId: string;
  displayName: string;
  description: string;
  /** Compact token for flair / catalog (emoji or short symbol). */
  icon: string;
};

const FORMATS: readonly PlayFormatDef[] = [
  {
    formatId: "commander",
    displayName: "Commander",
    description: "100-card singleton multiplayer with a legendary commander leading the deck.",
    icon: "⎔",
  },
  {
    formatId: "standard",
    displayName: "Standard",
    description: "Rotating competitive format built on the latest core expansions.",
    icon: "⬡",
  },
  {
    formatId: "modern",
    displayName: "Modern",
    description: "Non-rotating format from Eighth Edition forward — fast metagame swings.",
    icon: "◆",
  },
  {
    formatId: "vintage",
    displayName: "Vintage",
    description: "The deepest card pool with a restricted list — maximum combo potential.",
    icon: "◇",
  },
  {
    formatId: "pioneer",
    displayName: "Pioneer",
    description: "Return to Ravnica onward; a middle ground between Standard and Modern.",
    icon: "◎",
  },
  {
    formatId: "pauper",
    displayName: "Pauper",
    description: "Commons-only deckbuilding — tight constraints, huge creativity.",
    icon: "◈",
  },
  {
    formatId: "legacy",
    displayName: "Legacy",
    description: "Nearly the full card pool with a ban list — high power and fast games.",
    icon: "✧",
  },
  {
    formatId: "limited",
    displayName: "Limited",
    description: "Sealed and draft — build on the fly from a fresh pool every event.",
    icon: "▣",
  },
] as const;

const FORMAT_ID_SET = new Set(FORMATS.map((f) => f.formatId));

const BY_ID: Record<string, PlayFormatDef> = Object.fromEntries(FORMATS.map((f) => [f.formatId, f]));

export function listAllFormats(): readonly PlayFormatDef[] {
  return FORMATS;
}

export function isValidFormatId(id: string | null | undefined): boolean {
  const k = (id ?? "").trim().toLowerCase();
  return k.length > 0 && FORMAT_ID_SET.has(k);
}

export function getFormatById(id: string | null | undefined): PlayFormatDef | null {
  const k = (id ?? "").trim().toLowerCase();
  if (!k || !FORMAT_ID_SET.has(k)) return null;
  return BY_ID[k] ?? null;
}
