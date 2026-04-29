/** Social highlight line for grail cards (RPC `get_users_grail_highlight_batch`). */
export function buildGrailHighlightSummary(grailCount: number, highlightName: string | null | undefined): string | null {
  const n = Math.max(0, Math.floor(grailCount));
  if (n <= 0) return null;
  if (n === 1 && highlightName?.trim()) {
    return `Grail: ${highlightName.trim()}`;
  }
  if (n === 1) return "1 grail card";
  return `${n} grail cards`;
}
