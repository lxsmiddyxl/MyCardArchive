/**
 * Deterministic A/B assignment from `userId` + experiment key (stable across sessions).
 */
export function hash32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function assignExperimentVariant(
  userId: string,
  experimentKey: string,
  variants: readonly string[]
): string {
  if (variants.length === 0) throw new Error("variants required");
  const h = hash32(`${experimentKey}:${userId}`);
  return variants[h % variants.length]!;
}
