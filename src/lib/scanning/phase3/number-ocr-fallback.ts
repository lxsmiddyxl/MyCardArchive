import "server-only";

import sharp from "sharp";
import { runCardOcr } from "@/lib/scanning/v1/ocr";
import { parseCardFromOcrText } from "@/lib/scanning/v1/parse-text";
import type { NumberOcrPass } from "@/mca-utils/scan/numberFallback";

async function preprocess(buffer: Buffer, mode: "zoom" | "threshold" | "edge"): Promise<Buffer> {
  let img = sharp(buffer, { failOn: "none", sequentialRead: true }).rotate();
  if (mode === "zoom") {
    img = img.resize({ width: 1200, height: 1680, fit: "inside", withoutEnlargement: false });
  }
  if (mode === "threshold") {
    img = img
      .resize({ width: 900, height: 1260, fit: "inside", withoutEnlargement: true })
      .normalize()
      .threshold(150);
  }
  if (mode === "edge") {
    img = img
      .resize({ width: 900, height: 1260, fit: "inside", withoutEnlargement: true })
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
      });
  }
  return img.jpeg({ quality: 88 }).toBuffer();
}

/** Second-pass OCR on zoomed / thresholded / edge-enhanced crops. */
export async function runNumberOcrFallback(
  imageBuffer: Buffer,
  backBuffer: Buffer | null
): Promise<NumberOcrPass[]> {
  const passes: NumberOcrPass[] = [];
  const modes: Array<{ label: string; mode: "zoom" | "threshold" | "edge"; weight: number }> = [
    { label: "zoom", mode: "zoom", weight: 1 },
    { label: "threshold", mode: "threshold", weight: 0.85 },
    { label: "edge", mode: "edge", weight: 0.75 },
  ];

  for (const { label, mode, weight } of modes) {
    try {
      const buf = await preprocess(imageBuffer, mode);
      const text = await runCardOcr(buf, backBuffer);
      const extracted = parseCardFromOcrText(text);
      if (extracted.number_guess?.trim()) {
        passes.push({ label, number: extracted.number_guess.trim(), weight });
      }
    } catch {
      /* skip pass */
    }
  }
  return passes;
}
