import type { McaPlugin, PluginCapability } from "@/lib/plugins/types";

function validatePlugin(p: McaPlugin): string | null {
  if (!p.id?.trim()) return "missing id";
  if (!p.version?.trim()) return "missing version";
  if (!Array.isArray(p.capabilities) || p.capabilities.length === 0) return "capabilities required";
  const capSet: Set<PluginCapability> = new Set([
    "card_metadata",
    "scoring_rules",
    "grading_overlay",
  ]);
  for (const c of p.capabilities) {
    if (!capSet.has(c)) return `unknown capability: ${c}`;
  }
  return null;
}

export type PluginLoadResult = {
  plugins: McaPlugin[];
  errors: { id: string; error: string }[];
};

/**
 * Loads and validates plugins from a static registry (dev or future server allowlist).
 */
export function loadPluginsFromRegistry(registry: McaPlugin[]): PluginLoadResult {
  const plugins: McaPlugin[] = [];
  const errors: { id: string; error: string }[] = [];

  for (const p of registry) {
    const err = validatePlugin(p);
    if (err) {
      errors.push({ id: p.id ?? "?", error: err });
      continue;
    }
    plugins.push(p);
  }

  return { plugins, errors };
}

export function applyCardMetadataMerge(
  plugins: McaPlugin[],
  ctx: import("@/lib/plugins/types").CardMetadataContext
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const p of plugins) {
    if (!p.capabilities.includes("card_metadata") || !p.extendCardMetadata) continue;
    Object.assign(out, p.extendCardMetadata(ctx));
  }
  return out;
}
