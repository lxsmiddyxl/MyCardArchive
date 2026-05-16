/** Grayscale image buffer for scan heuristics (client-safe). */

export type GrayImage = {
  data: Uint8Array;
  width: number;
  height: number;
};

export function regionMean(
  g: GrayImage,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): number {
  let s = 0;
  let n = 0;
  const X0 = Math.max(0, x0);
  const Y0 = Math.max(0, y0);
  const X1 = Math.min(g.width - 1, x1);
  const Y1 = Math.min(g.height - 1, y1);
  for (let y = Y0; y <= Y1; y++) {
    for (let x = X0; x <= X1; x++) {
      s += g.data[y * g.width + x];
      n++;
    }
  }
  return n ? s / n : 0;
}

export function regionStd(
  g: GrayImage,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): number {
  const m = regionMean(g, x0, y0, x1, y1);
  let acc = 0;
  let n = 0;
  const X0 = Math.max(0, x0);
  const Y0 = Math.max(0, y0);
  const X1 = Math.min(g.width - 1, x1);
  const Y1 = Math.min(g.height - 1, y1);
  for (let y = Y0; y <= Y1; y++) {
    for (let x = X0; x <= X1; x++) {
      const d = g.data[y * g.width + x] - m;
      acc += d * d;
      n++;
    }
  }
  return n ? Math.sqrt(acc / n) : 0;
}

export function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}
