export type ReputationDimensionId =
  | "helpfulness"
  | "expertise"
  | "positivity"
  | "reliability"
  | "contribution";

export type ReputationDimensionMeta = {
  id: ReputationDimensionId;
  displayName: string;
  description: string;
  icon: string;
  colorToken: string;
  /** Signals that inform this dimension (for copy, not scoring logic). */
  signals: readonly string[];
};

export const REPUTATION_DIMENSIONS: readonly ReputationDimensionMeta[] = [
  {
    id: "helpfulness",
    displayName: "Helpfulness",
    description:
      "Thoughtful replies, community answers, and guide-style posts that help other collectors.",
    icon: "💬",
    colorToken: "mca-accent-strong",
    signals: ["Community comments", "Posts that explain", "Guide-style sharing"],
  },
  {
    id: "expertise",
    displayName: "Expertise",
    description:
      "Depth across decks, sets, rarity knowledge, and pinned taste — built from public identity signals only.",
    icon: "🧠",
    colorToken: "mca-accent",
    signals: ["Deck building", "Set & binder mastery", "Fandom depth", "Rarity mix"],
  },
  {
    id: "positivity",
    displayName: "Positivity",
    description: "Encouragement others show for your public posts — likes and constructive participation only.",
    icon: "✨",
    colorToken: "mca-ok",
    signals: ["Likes received on posts", "Constructive community tone"],
  },
  {
    id: "reliability",
    displayName: "Reliability",
    description:
      "Steady presence, seasonal participation, and consistent check-ins — never penalized for stepping away.",
    icon: "⏱️",
    colorToken: "mca-gold",
    signals: ["Activity streaks", "Seasonal moments", "Recent presence when opted in"],
  },
  {
    id: "contribution",
    displayName: "Contribution",
    description: "Catalog scans, binder updates, deck work, and posts that grow the shared archive.",
    icon: "📚",
    colorToken: "mca-warn",
    signals: ["Scans", "Binder & deck edits", "Community posts"],
  },
] as const;

const BY_ID: Record<ReputationDimensionId, ReputationDimensionMeta> = Object.fromEntries(
  REPUTATION_DIMENSIONS.map((d) => [d.id, d])
) as Record<ReputationDimensionId, ReputationDimensionMeta>;

export function getReputationDimensionById(id: string): ReputationDimensionMeta | null {
  const k = id.trim() as ReputationDimensionId;
  return BY_ID[k] ?? null;
}
