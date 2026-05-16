import { clamp01, regionMean, regionStd, type GrayImage } from "@/mca-utils/scan/imageGray";

export type SetSymbolCandidate = {
  setId: string;
  confidence: number;
};

/** Heuristic set-symbol region classifier (template-free; shape/color cues). */
export function classifySetSymbol(
  g: GrayImage,
  knownSetIds: string[] = []
): SetSymbolCandidate[] {
  const w = g.width;
  const h = g.height;
  const x0 = Math.floor(w * 0.04);
  const y0 = Math.floor(h * 0.78);
  const x1 = Math.floor(w * 0.18);
  const y1 = Math.floor(h * 0.96);
  const mean = regionMean(g, x0, y0, x1, y1);
  const std = regionStd(g, x0, y0, x1, y1);
  const edge = regionStd(g, x0, y0, x1, Math.floor(y0 + (y1 - y0) * 0.4));

  const base = clamp01(std / 45 + edge / 50);
  const paletteBoost = clamp01(1 - Math.abs(mean - 140) / 100);

  const pool =
    knownSetIds.length > 0
      ? knownSetIds.slice(0, 8)
      : ["sv1", "sv2", "sv3", "swsh1", "base1", "celebrations"];

  return pool
    .map((setId, i) => ({
      setId,
      confidence: clamp01(base * paletteBoost * (1 - i * 0.06)),
    }))
    .sort((a, b) => b.confidence - a.confidence);
}
