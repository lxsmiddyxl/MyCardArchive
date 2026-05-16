/** Merge multi-pass OCR number guesses into a single best stem. */

export type NumberOcrPass = {
  label: string;
  number: string;
  weight: number;
};

export function mergeNumberFallbackPasses(passes: NumberOcrPass[]): string {
  const scores = new Map<string, number>();
  for (const p of passes) {
    const stem = normalizeNumberStem(p.number);
    if (!stem) continue;
    const prev = scores.get(stem) ?? 0;
    scores.set(stem, prev + p.weight);
  }
  let best = "";
  let bestScore = 0;
  for (const [stem, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      best = stem;
    }
  }
  return best;
}

export function normalizeNumberStem(raw: string): string {
  const t = raw.trim().replace(/^#/, "");
  if (!t) return "";
  const slash = t.split("/")[0]?.trim() ?? t;
  return slash.replace(/^0+/, "") || slash;
}

export function numberMatchScore(candidateNumber: string, ocrStem: string): number {
  if (!ocrStem) return 0;
  const c = normalizeNumberStem(candidateNumber);
  if (!c) return 0;
  if (c === ocrStem) return 1;
  if (c.startsWith(ocrStem) || ocrStem.startsWith(c)) return 0.75;
  return 0;
}
