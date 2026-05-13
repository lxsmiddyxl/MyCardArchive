/** Qualitative “why” lines for feed rows composed outside SQL (Phase 73). */

export function buildFeedV3SupplementSignalLine(kind: string, payload: unknown): string | null {
  const p = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  if (kind === "showcase_created") {
    const title = typeof p.title === "string" && p.title.trim() ? p.title.trim() : "Showcase";
    return `Curated surface: ${title} — surfaced because you follow this trainer.`;
  }
  if (kind === "trade_completed") {
    return "Completed Pokémon TCG trade — qualitative completion signal (no payment details).";
  }
  if (kind === "follow_edge_created") {
    return "Social graph edge — follow activity near you in the hobby graph.";
  }
  return null;
}

export function feedV3KindLabel(kind: string): string {
  switch (kind) {
    case "showcase_created":
      return "Showcase";
    case "trade_completed":
      return "Trade completed";
    case "follow_edge_created":
      return "New follow";
    default:
      return kind;
  }
}
