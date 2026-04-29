export type InfluenceDimensionId =
  | "identity_reach"
  | "contribution_reach"
  | "expertise_reach"
  | "social_reach"
  | "seasonal_reach";

export type InfluenceDimensionMeta = {
  id: InfluenceDimensionId;
  displayName: string;
  description: string;
  icon: string;
  colorToken: string;
  signals: readonly string[];
};

export const INFLUENCE_DIMENSIONS: readonly InfluenceDimensionMeta[] = [
  {
    id: "identity_reach",
    displayName: "Identity Reach",
    description: "Persona resonance, club breadth, and discoverability from public collector identity.",
    icon: "🧭",
    colorToken: "mca-accent-strong",
    signals: ["Persona text", "Club breadth", "Fandom anchors"],
  },
  {
    id: "contribution_reach",
    displayName: "Contribution Reach",
    description: "How often your posts, comments, and scans add momentum to community surfaces.",
    icon: "📝",
    colorToken: "mca-warn",
    signals: ["Community posts", "Comments", "Scans", "Deck updates"],
  },
  {
    id: "expertise_reach",
    displayName: "Expertise Reach",
    description: "Knowledge impact from deckcraft, mastery progress, and rarity-informed collection depth.",
    icon: "🧠",
    colorToken: "mca-accent",
    signals: ["Deck stats", "Set/binder mastery", "Rarity profile"],
  },
  {
    id: "social_reach",
    displayName: "Social Reach",
    description: "Connectedness through mutuals, similarity graph overlap, and shared clubs.",
    icon: "🕸️",
    colorToken: "mca-ok",
    signals: ["Mutual follows", "Similarity overlap", "Shared clubs"],
  },
  {
    id: "seasonal_reach",
    displayName: "Seasonal Reach",
    description: "Recurring visibility from seasonal participation, YIR engagement, and healthy streak patterns.",
    icon: "🌤️",
    colorToken: "mca-gold",
    signals: ["Seasonal events", "Year in Review", "Activity streaks"],
  },
] as const;

const BY_ID: Record<InfluenceDimensionId, InfluenceDimensionMeta> = Object.fromEntries(
  INFLUENCE_DIMENSIONS.map((d) => [d.id, d])
) as Record<InfluenceDimensionId, InfluenceDimensionMeta>;

export function getInfluenceDimensionById(id: string): InfluenceDimensionMeta | null {
  const k = id.trim() as InfluenceDimensionId;
  return BY_ID[k] ?? null;
}
