export type SetSymbolDetection = {
  set_name: string;
  confidence: number;
};

/**
 * Mock set-symbol / edition corner detection.
 * Never throws.
 */
export async function mockDetectSetSymbol(
  imageBuffer: Buffer
): Promise<SetSymbolDetection> {
  try {
    const n = imageBuffer?.length ?? 0;
    const sets = [
      { name: "Scarlet & Violet", confidence: 0.78 },
      { name: "Obsidian Flames", confidence: 0.71 },
      { name: "Paldea Evolved", confidence: 0.66 },
      { name: "151", confidence: 0.55 },
    ];
    const pick = sets[n % sets.length]!;
    const jitter = ((n % 13) - 6) / 200;
    return {
      set_name: pick.name,
      confidence: clamp01(pick.confidence + jitter),
    };
  } catch {
    return { set_name: "Unknown", confidence: 0 };
  }
}

function clamp01(x: number): number {
  if (typeof x !== "number" || !Number.isFinite(x)) {
    return 0;
  }
  return Math.max(0, Math.min(1, x));
}
