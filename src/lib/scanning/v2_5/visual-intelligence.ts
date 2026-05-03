import "server-only";

import sharp from "sharp";
import { scanV25ConfidenceBand } from "@/lib/scanning/v2_5/confidence-band";
import type { ScanV2VisionPrediction } from "@/lib/scanning/v2/vision-types";
import type {
  ScanV25CenteringFusion,
  ScanV25HoloFusion,
  ScanV25HoloLabel,
  ScanV25RarityFusion,
  ScanV25RarityLabel,
  ScanV25RaritySymbolHint,
  ScanV25SurfaceFusion,
  ScanV25VisualIntel,
} from "@/lib/scanning/v2_5/types";

const MAX_W = 480;

type Gray = { data: Uint8Array; w: number; h: number };

async function toGray(buffer: Buffer): Promise<Gray | null> {
  try {
    const { data, info } = await sharp(buffer, { failOn: "none", sequentialRead: true })
      .rotate()
      .resize({
        width: MAX_W,
        height: 680,
        fit: "inside",
        withoutEnlargement: true,
      })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (!info.width || !info.height || data.length < info.width * info.height) {
      return null;
    }
    return { data: new Uint8Array(data), w: info.width, h: info.height };
  } catch {
    return null;
  }
}

function at(g: Gray, x: number, y: number): number {
  return g.data[y * g.w + x];
}

/** Mean luminance in axis-aligned rectangle (inclusive bounds). */
function regionMean(g: Gray, x0: number, y0: number, x1: number, y1: number): number {
  let s = 0;
  let n = 0;
  const X0 = Math.max(0, x0);
  const Y0 = Math.max(0, y0);
  const X1 = Math.min(g.w - 1, x1);
  const Y1 = Math.min(g.h - 1, y1);
  for (let y = Y0; y <= Y1; y++) {
    for (let x = X0; x <= X1; x++) {
      s += g.data[y * g.w + x];
      n++;
    }
  }
  return n ? s / n : 0;
}

function regionStd(g: Gray, x0: number, y0: number, x1: number, y1: number): number {
  const m = regionMean(g, x0, y0, x1, y1);
  let acc = 0;
  let n = 0;
  const X0 = Math.max(0, x0);
  const Y0 = Math.max(0, y0);
  const X1 = Math.min(g.w - 1, x1);
  const Y1 = Math.min(g.h - 1, y1);
  for (let y = Y0; y <= Y1; y++) {
    for (let x = X0; x <= X1; x++) {
      const d = g.data[y * g.w + x] - m;
      acc += d * d;
      n++;
    }
  }
  return n ? Math.sqrt(acc / n) : 0;
}

function holoHeuristic(g: Gray): {
  specular: number;
  contrastSpike: number;
  reflectiveCluster: number;
  label: ScanV25HoloLabel;
  score: number;
} {
  const { w, h } = g;
  const x0 = Math.floor(w * 0.22);
  const x1 = Math.floor(w * 0.78) - 1;
  const y0 = Math.floor(h * 0.18);
  const y1 = Math.floor(h * 0.82) - 1;
  const cx0 = Math.floor(w * 0.3);
  const cx1 = Math.floor(w * 0.7) - 1;
  const cy0 = Math.floor(h * 0.28);
  const cy1 = Math.floor(h * 0.72) - 1;

  const centerStd = regionStd(g, cx0, cy0, cx1, cy1);
  const contrastSpike = Math.min(1, centerStd / 38);

  const cMean = regionMean(g, cx0, cy0, cx1, cy1);
  let hi = 0;
  let n = 0;
  for (let y = cy0; y <= cy1; y++) {
    for (let x = cx0; x <= cx1; x++) {
      const v = at(g, x, y);
      n++;
      if (v > Math.max(210, cMean + 42)) hi++;
    }
  }
  const reflectiveCluster = n ? hi / n : 0;

  let specSum = 0;
  let specN = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const v = at(g, x, y);
      specN++;
      if (v > 235) specSum++;
    }
  }
  const specular = specN ? specSum / specN : 0;

  const edgeL = regionMean(g, 0, 0, Math.floor(w * 0.1) - 1, h - 1);
  const edgeR = regionMean(g, Math.floor(w * 0.9), 0, w - 1, h - 1);
  const edgeMean = (edgeL + edgeR) / 2;
  const reverseHint = edgeMean + 12 < cMean && contrastSpike > 0.32 && reflectiveCluster < 0.14;

  let label: ScanV25HoloLabel = "Non-Holo";
  let score = 0.5;
  if (reflectiveCluster > 0.1 && contrastSpike > 0.52) {
    label = "Holo";
    score = 0.55 + 0.25 * contrastSpike + 0.2 * Math.min(1, reflectiveCluster * 6);
  } else if (reverseHint || (reflectiveCluster > 0.05 && contrastSpike > 0.38 && edgeMean < cMean - 8)) {
    label = "Reverse Holo";
    score = 0.5 + 0.22 * contrastSpike;
  } else if (reflectiveCluster < 0.035 && contrastSpike < 0.34) {
    label = "Non-Holo";
    score = 0.52 + 0.2 * (1 - contrastSpike);
  }

  return { specular, contrastSpike, reflectiveCluster, label, score: Math.min(1, score) };
}

function visionToHoloLabel(h: ScanV2VisionPrediction["holo_status"]): ScanV25HoloLabel | null {
  switch (h) {
    case "holo":
      return "Holo";
    case "reverse_holo":
      return "Reverse Holo";
    case "none":
      return "Non-Holo";
    default:
      return null;
  }
}

function fuseHolo(vision: ScanV2VisionPrediction, H: ReturnType<typeof holoHeuristic>): ScanV25HoloFusion {
  const modelLabel = visionToHoloLabel(vision.holo_status);
  const vConf = Math.max(0, Math.min(1, vision.overall_confidence));
  const modelWeight = 0.28 + 0.52 * vConf;
  const heuristicWeight = 1 - modelWeight;
  const agreement = modelLabel != null && modelLabel === H.label;

  let label: ScanV25HoloLabel = H.label;
  if (modelLabel) {
    if (agreement) label = modelLabel;
    else if (vConf >= 0.62) label = modelLabel;
    else if (H.score >= 0.62) label = H.label;
    else label = modelLabel;
  }

  const internal = agreement ? 0.55 * vConf + 0.45 * H.score : Math.max(vConf, H.score) * 0.78;
  const band = scanV25ConfidenceBand(internal);

  return {
    label,
    confidence_band: band,
    fusion: {
      model_weight: Math.round(modelWeight * 100) / 100,
      heuristic_weight: Math.round(heuristicWeight * 100) / 100,
      agreement,
      specular_score: Math.round(H.specular * 1000) / 1000,
      contrast_spike_score: Math.round(H.contrastSpike * 1000) / 1000,
      reflective_cluster_score: Math.round(H.reflectiveCluster * 1000) / 1000,
      notes: agreement ? "Model and specular heuristics agreed." : "Model and heuristics diverged; routed by confidence.",
    },
  };
}

const RARITY_ORDER: { keys: string[]; label: ScanV25RarityLabel; rank: number }[] = [
  { keys: ["special illustration"], label: "Special Illustration Rare", rank: 95 },
  { keys: ["illustration rare"], label: "Illustration Rare", rank: 88 },
  { keys: ["amazing rare"], label: "Amazing Rare", rank: 86 },
  { keys: ["hyper rare"], label: "Hyper Rare", rank: 84 },
  { keys: ["secret rare", "secret"], label: "Secret Rare", rank: 82 },
  { keys: ["ultra rare", "ultra"], label: "Ultra Rare", rank: 70 },
  { keys: ["double rare"], label: "Double Rare", rank: 62 },
  { keys: ["rare holo", "holo rare"], label: "Rare", rank: 55 },
  { keys: ["rare"], label: "Rare", rank: 50 },
  { keys: ["uncommon"], label: "Uncommon", rank: 30 },
  { keys: ["common"], label: "Common", rank: 15 },
  { keys: ["promo"], label: "Promo", rank: 40 },
];

function parseRarityLabel(raw: string): { label: ScanV25RarityLabel; rank: number } | null {
  const t = raw.toLowerCase().trim();
  if (!t) return null;
  for (const row of RARITY_ORDER) {
    for (const k of row.keys) {
      if (t.includes(k)) return { label: row.label, rank: row.rank };
    }
  }
  if (/\b\d{1,3}\/\d{1,3}\b/.test(t) && t.length < 24) return { label: "Common", rank: 12 };
  return null;
}

function symbolHeuristic(g: Gray): { hint: ScanV25RaritySymbolHint; complexity: number } {
  const { w, h } = g;
  const y0 = Math.floor(h * 0.78);
  const x0 = Math.floor(w * 0.55);

  let edge = 0;
  let dark = 0;
  let n = 0;
  for (let y = y0 + 1; y < h - 1; y++) {
    for (let x = x0 + 1; x < w - 1; x++) {
      const c = at(g, x, y);
      const gx = Math.abs(c - at(g, x + 1, y)) + Math.abs(c - at(g, x - 1, y));
      const gy = Math.abs(c - at(g, x, y + 1)) + Math.abs(c - at(g, x, y - 1));
      edge += gx + gy;
      if (c < 72) dark++;
      n++;
    }
  }
  const edgeMean = n ? edge / n : 0;
  const darkFrac = n ? dark / n : 0;
  const complexity = Math.min(1, edgeMean / 85 + darkFrac * 0.35);

  let hint: ScanV25RaritySymbolHint = "unknown";
  if (darkFrac < 0.02 && edgeMean < 22) hint = "none";
  else if (edgeMean > 48 && darkFrac > 0.06) hint = "star";
  else if (edgeMean > 32 && darkFrac > 0.04) hint = "diamond";
  else if (darkFrac > 0.035 || edgeMean > 26) hint = "circle";

  return { hint, complexity: Math.round(complexity * 1000) / 1000 };
}

function fuseRarity(
  catalogRarity: string | null | undefined,
  visionRarity: string | undefined,
  symbol: ReturnType<typeof symbolHeuristic>
): ScanV25RarityFusion {
  const cat = catalogRarity?.trim() || null;
  const vis = visionRarity?.trim() || null;
  const catParsed = cat ? parseRarityLabel(cat) : null;
  const visParsed = vis ? parseRarityLabel(vis) : null;
  const catalog_ambiguous =
    Boolean(cat && !catParsed) ||
    (catParsed != null && visParsed != null && catParsed.rank !== visParsed.rank);

  let rank = 0;
  let votes = 0;
  if (catParsed) {
    rank += catParsed.rank * 1.35;
    votes += 1.35;
  }
  if (visParsed) {
    rank += visParsed.rank * 1;
    votes += 1;
  }
  if (!catParsed && !visParsed && cat) {
    rank += 22;
    votes += 0.5;
  }
  if (!catParsed && !visParsed && vis) {
    rank += 28;
    votes += 0.55;
  }

  let symbolBoost = 0;
  if (symbol.hint === "star") symbolBoost = 12;
  else if (symbol.hint === "diamond") symbolBoost = 8;
  else if (symbol.hint === "circle") symbolBoost = 4;

  rank += symbolBoost * (0.4 + symbol.complexity * 0.6);
  votes += symbol.complexity > 0.35 ? 0.45 : 0.2;

  const avg = votes > 0 ? rank / votes : 0;
  let label: ScanV25RarityLabel = "Unknown";
  if (avg >= 90) label = "Special Illustration Rare";
  else if (avg >= 84) label = "Illustration Rare";
  else if (avg >= 80) label = "Secret Rare";
  else if (avg >= 76) label = "Hyper Rare";
  else if (avg >= 68) label = "Ultra Rare";
  else if (avg >= 58) label = "Double Rare";
  else if (avg >= 46) label = "Rare";
  else if (avg >= 24) label = "Uncommon";
  else if (avg > 0) label = "Common";

  if (catParsed && visParsed && catParsed.label === visParsed.label) {
    label = catParsed.label;
  } else if (catParsed && !visParsed) {
    label = catParsed.label;
  } else if (!catParsed && visParsed) {
    label = visParsed.label;
  }

  const conf = Math.min(1, 0.35 + (votes / 2.2) * 0.45 + (catParsed && visParsed ? 0.2 : 0));
  return {
    label,
    confidence_band: scanV25ConfidenceBand(conf),
    fusion: {
      catalog_rarity: cat,
      vision_rarity: vis,
      symbol_hint: symbol.hint,
      symbol_complexity: symbol.complexity,
      catalog_ambiguous,
      notes: catalog_ambiguous ? "Catalog and vision rarity signals differ or catalog text was non-standard." : undefined,
    },
  };
}

function columnVariance(g: Gray, x: number): number {
  let sum = 0;
  let sum2 = 0;
  for (let y = 0; y < g.h; y++) {
    const v = at(g, x, y);
    sum += v;
    sum2 += v * v;
  }
  const n = g.h;
  const mean = sum / n;
  return Math.max(0, sum2 / n - mean * mean);
}

function findContentMargins(g: Gray): { L: number; R: number; T: number; B: number } | null {
  const { w, h } = g;
  const thresh = 85;
  let L = 0;
  for (let x = 0; x < w; x++) {
    if (columnVariance(g, x) > thresh) {
      L = x;
      break;
    }
  }
  let R = w - 1;
  for (let x = w - 1; x >= 0; x--) {
    if (columnVariance(g, x) > thresh) {
      R = x;
      break;
    }
  }
  let T = 0;
  for (let y = 0; y < h; y++) {
    let rowVar = 0;
    let sum = 0;
    let sum2 = 0;
    for (let x = 0; x < w; x++) {
      const v = at(g, x, y);
      sum += v;
      sum2 += v * v;
    }
    rowVar = sum2 / w - (sum / w) ** 2;
    if (rowVar > thresh) {
      T = y;
      break;
    }
  }
  let B = h - 1;
  for (let y = h - 1; y >= 0; y--) {
    let sum = 0;
    let sum2 = 0;
    for (let x = 0; x < w; x++) {
      const v = at(g, x, y);
      sum += v;
      sum2 += v * v;
    }
    const rowVar = sum2 / w - (sum / w) ** 2;
    if (rowVar > thresh) {
      B = y;
      break;
    }
  }
  if (R <= L + 8 || B <= T + 8) return null;
  return { L, R, T, B };
}

function fuseCentering(g: Gray): ScanV25CenteringFusion {
  const m = findContentMargins(g);
  if (!m) {
    return {
      label: "Slightly Off-Center",
      confidence_band: "weak",
      fusion: {
        left_border_ratio: 0,
        right_border_ratio: 0,
        top_border_ratio: 0,
        bottom_border_ratio: 0,
        asymmetry_score: 0.5,
        notes: "Could not estimate borders reliably (uniform sleeve or crop).",
      },
    };
  }
  const { w, h } = g;
  const innerW = m.R - m.L + 1;
  const innerH = m.B - m.T + 1;
  const leftBorder = m.L;
  const rightBorder = w - 1 - m.R;
  const topBorder = m.T;
  const bottomBorder = h - 1 - m.B;
  const lr = Math.max(1, leftBorder + rightBorder);
  const tb = Math.max(1, topBorder + bottomBorder);
  const left_border_ratio = leftBorder / lr;
  const right_border_ratio = rightBorder / lr;
  const top_border_ratio = topBorder / tb;
  const bottom_border_ratio = bottomBorder / tb;
  const asymLR = Math.abs(leftBorder - rightBorder) / innerW;
  const asymTB = Math.abs(topBorder - bottomBorder) / innerH;
  const asymmetry_score = Math.min(1, (asymLR + asymTB) / 2);

  let label: ScanV25CenteringFusion["label"] = "Well-Centered";
  if (asymmetry_score > 0.26) label = "Off-Center";
  else if (asymmetry_score > 0.1) label = "Slightly Off-Center";

  const band = scanV25ConfidenceBand(1 - asymmetry_score * 1.15);
  return {
    label,
    confidence_band: band,
    fusion: {
      left_border_ratio: Math.round(left_border_ratio * 1000) / 1000,
      right_border_ratio: Math.round(right_border_ratio * 1000) / 1000,
      top_border_ratio: Math.round(top_border_ratio * 1000) / 1000,
      bottom_border_ratio: Math.round(bottom_border_ratio * 1000) / 1000,
      asymmetry_score: Math.round(asymmetry_score * 1000) / 1000,
    },
  };
}

function fuseSurface(g: Gray): ScanV25SurfaceFusion {
  const { w, h } = g;
  let lap = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const c = at(g, x, y);
      lap += Math.abs(c - at(g, x + 1, y)) + Math.abs(c - at(g, x, y + 1));
      n++;
    }
  }
  const gradient_energy = n ? lap / n : 0;

  const corner = (x0: number, y0: number, x1: number, y1: number) => {
    let s = 0;
    let c = 0;
    for (let y = y0; y <= y1 && y < h - 1; y++) {
      for (let x = x0; x <= x1 && x < w - 1; x++) {
        const v = at(g, x, y);
        s += Math.abs(v - at(g, x + 1, y)) + Math.abs(v - at(g, x, y + 1));
        c++;
      }
    }
    return c ? s / c : 0;
  };
  const cw = Math.floor(w * 0.18);
  const ch = Math.floor(h * 0.18);
  const c1 = corner(0, 0, cw, ch);
  const c2 = corner(w - cw - 1, 0, w - 1, ch);
  const c3 = corner(0, h - ch - 1, cw, h - 1);
  const c4 = corner(w - cw - 1, h - ch - 1, w - 1, h - 1);
  const corner_edge_energy = (c1 + c2 + c3 + c4) / 4;

  let white = 0;
  let wn = 0;
  const ring = 0.08;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const edge =
        x < w * ring || x > w * (1 - ring) || y < h * ring || y > h * (1 - ring);
      if (!edge) continue;
      wn++;
      if (at(g, x, y) > 248) white++;
    }
  }
  const whitening_score = wn ? white / wn : 0;

  let label: ScanV25SurfaceFusion["label"] = "Clean Surface";
  if (gradient_energy > 26 || corner_edge_energy > 34 || whitening_score > 0.045) {
    label = "Visible Wear";
  } else if (gradient_energy > 17 || corner_edge_energy > 26 || whitening_score > 0.022) {
    label = "Minor Wear";
  }

  const wearScore = Math.min(
    1,
    gradient_energy / 42 + corner_edge_energy / 48 + whitening_score * 8
  );
  const band = scanV25ConfidenceBand(1 - wearScore * 0.95);

  return {
    label,
    confidence_band: band,
    fusion: {
      gradient_energy: Math.round(gradient_energy * 100) / 100,
      corner_edge_energy: Math.round(corner_edge_energy * 100) / 100,
      whitening_score: Math.round(whitening_score * 1000) / 1000,
    },
  };
}

export type RunV25VisualIntelOptions = {
  catalogBestMatchRarity: string | null | undefined;
};

export type RunV25VisualIntelResult =
  | { ok: true; intel: ScanV25VisualIntel; degraded: boolean }
  | { ok: false; reason: "decode_failed" };

/**
 * Collector-grade qualitative hints from the scan image + vision/catalog context.
 * Not a substitute for professional grading.
 */
export async function runV25VisualIntel(
  imageBuffer: Buffer,
  vision: ScanV2VisionPrediction,
  opts: RunV25VisualIntelOptions
): Promise<RunV25VisualIntelResult> {
  const gray = await toGray(imageBuffer);
  if (!gray) {
    return { ok: false, reason: "decode_failed" };
  }

  const H = holoHeuristic(gray);
  const holo = fuseHolo(vision, H);
  const sym = symbolHeuristic(gray);
  const rarity = fuseRarity(opts.catalogBestMatchRarity, vision.rarity_guess, sym);
  const centering = fuseCentering(gray);
  const surface = fuseSurface(gray);

  const degraded =
    gray.w < 140 ||
    gray.h < 140 ||
    gray.w * gray.h < 46_000 ||
    regionStd(gray, 0, 0, gray.w - 1, gray.h - 1) < 11 ||
    Boolean(centering.fusion.notes?.includes("Could not"));

  return {
    ok: true,
    intel: { holo, rarity, centering, surface },
    degraded,
  };
}
