import { regionStd, type GrayImage } from "@/mca-utils/scan/imageGray";

export type CardRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
};

const CARD_ASPECT = 0.72;
const ASPECT_TOLERANCE = 0.22;

function aspectScore(w: number, h: number): number {
  if (h <= 0) return 0;
  const ratio = w / h;
  const delta = Math.abs(ratio - CARD_ASPECT);
  return Math.max(0, 1 - delta / ASPECT_TOLERANCE);
}

/** Detect rectangular card-like regions (contour-lite grid scan). */
export function detectCardRegions(g: GrayImage, maxRegions = 9): CardRegion[] {
  const w = g.width;
  const h = g.height;
  const regions: CardRegion[] = [];
  const cols = 3;
  const rows = 3;
  const cellW = Math.floor(w / cols);
  const cellH = Math.floor(h / rows);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cellW;
      const y = row * cellH;
      const rw = Math.min(cellW, w - x);
      const rh = Math.min(cellH, h - y);
      const std = regionStd(g, x, y, x + rw - 1, y + rh - 1);
      const score = aspectScore(rw, rh) * Math.min(1, std / 35);
      if (score > 0.25) {
        regions.push({ x, y, width: rw, height: rh, score });
      }
    }
  }

  if (regions.length === 0) {
    regions.push({ x: 0, y: 0, width: w, height: h, score: 0.5 });
  }

  return regions.sort((a, b) => b.score - a.score).slice(0, maxRegions);
}
