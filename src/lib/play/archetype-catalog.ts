export type DeckArchetypeDef = {
  archetypeId: string;
  displayName: string;
  description: string;
  icon: string;
};

const ARCHETYPES: readonly DeckArchetypeDef[] = [
  {
    archetypeId: "aggro",
    displayName: "Aggro",
    description: "Low curve, fast clocks — end games before opponents stabilize.",
    icon: "⚡",
  },
  {
    archetypeId: "control",
    displayName: "Control",
    description: "Answers, card advantage, and a decisive late-game finisher.",
    icon: "🛡️",
  },
  {
    archetypeId: "midrange",
    displayName: "Midrange",
    description: "Efficient creatures and removal — curve out and out-value.",
    icon: "⚖️",
  },
  {
    archetypeId: "combo",
    displayName: "Combo",
    description: "Assemble pieces for a deterministic or high-lethality win.",
    icon: "🔗",
  },
  {
    archetypeId: "tribal",
    displayName: "Tribal",
    description: "Creature-type synergy — lords, lords, and more lords.",
    icon: "🐾",
  },
  {
    archetypeId: "tempo",
    displayName: "Tempo",
    description: "Threats plus disruption — never quite let them have their turn.",
    icon: "🌊",
  },
  {
    archetypeId: "ramp",
    displayName: "Ramp",
    description: "Big mana fast — payoffs that go over the top of fair decks.",
    icon: "🌲",
  },
  {
    archetypeId: "stax",
    displayName: "Stax",
    description: "Resource denial and prison pieces — the table plays at your pace.",
    icon: "⛓️",
  },
  {
    archetypeId: "burn",
    displayName: "Burn",
    description: "Direct damage to face — every card is a Lightning Bolt with extra steps.",
    icon: "🔥",
  },
] as const;

const ARCHETYPE_ID_SET = new Set(ARCHETYPES.map((a) => a.archetypeId));

const BY_ID: Record<string, DeckArchetypeDef> = Object.fromEntries(ARCHETYPES.map((a) => [a.archetypeId, a]));

export function listAllArchetypes(): readonly DeckArchetypeDef[] {
  return ARCHETYPES;
}

export function isValidArchetypeId(id: string | null | undefined): boolean {
  const k = (id ?? "").trim().toLowerCase();
  return k.length > 0 && ARCHETYPE_ID_SET.has(k);
}

export function getArchetypeById(id: string | null | undefined): DeckArchetypeDef | null {
  const k = (id ?? "").trim().toLowerCase();
  if (!k || !ARCHETYPE_ID_SET.has(k)) return null;
  return BY_ID[k] ?? null;
}
