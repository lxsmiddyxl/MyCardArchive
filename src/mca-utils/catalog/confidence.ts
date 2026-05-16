import type { CatalogCardHit } from "@/lib/dto/catalog";
import type { CatalogSearchMode } from "@/lib/catalog/search-modes";

export type CatalogMatchConfidenceBand = "high" | "medium" | "low";

export type CatalogMatchConfidenceInput = {
  query: string;
  hit: CatalogCardHit;
  searchMode: CatalogSearchMode;
  scopedSetId?: string | null;
  autoDetected?: boolean;
};

function normalizeToken(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function numberStem(n: string): string {
  return (n.split("/")[0]?.trim() ?? n.trim()).replace(/^#/, "");
}

/** Score 0–1 for catalog match confidence (manual add + scan alignment). */
export function scoreCatalogMatch(input: CatalogMatchConfidenceInput): number {
  const q = input.query.trim();
  const hit = input.hit;
  if (!q || !hit.name) return 0.35;

  let score = 0.2;
  const qn = normalizeToken(q);
  const name = normalizeToken(hit.name);
  const numQ = numberStem(q);
  const numH = numberStem(hit.number ?? "");

  if (numQ && numH && numQ === numH) score += 0.35;
  else if (numQ && numH && (numH.startsWith(numQ) || q.includes(numH))) score += 0.2;

  if (q.includes("/") && hit.number?.includes("/") && hit.number === q.replace(/\s/g, "")) {
    score += 0.15;
  }

  if (name === qn) score += 0.25;
  else if (name.startsWith(qn) || qn.startsWith(name)) score += 0.15;
  else if (name.includes(qn) || qn.includes(name)) score += 0.08;

  if (input.scopedSetId?.trim() && hit.set_id === input.scopedSetId.trim()) {
    score += 0.12;
  }

  if (input.searchMode === "set" && hit.set_id) score += 0.05;
  if (input.searchMode === "number") score += 0.08;
  if (input.autoDetected) score += 0.1;

  const setTok = normalizeToken(hit.set ?? "");
  if (setTok && qn.includes(setTok)) score += 0.1;

  return Math.max(0, Math.min(1, score));
}

export function catalogMatchConfidenceBand(score: number): CatalogMatchConfidenceBand {
  if (score >= 0.72) return "high";
  if (score >= 0.48) return "medium";
  return "low";
}

export function catalogMatchConfidenceLabel(band: CatalogMatchConfidenceBand): string {
  switch (band) {
    case "high":
      return "High confidence";
    case "medium":
      return "Medium confidence";
    default:
      return "Low confidence";
  }
}

export function resolveCatalogMatchConfidence(
  input: CatalogMatchConfidenceInput
): { score: number; band: CatalogMatchConfidenceBand } {
  const score = scoreCatalogMatch(input);
  return { score, band: catalogMatchConfidenceBand(score) };
}
