/**
 * Stable JSON digest for presence `track` metadata (excludes `at`, which is refreshed each track).
 * Used to suppress duplicate identical tracks on the same topic (Phase 38).
 */
export function presenceMetadataDigest(metadata: Record<string, unknown>): string {
  const { at: _ignored, ...rest } = metadata;
  void _ignored;
  const keys = Object.keys(rest).sort();
  const normalized: Record<string, unknown> = {};
  for (const k of keys) {
    normalized[k] = rest[k];
  }
  return JSON.stringify(normalized);
}
