import type { McaPlugin } from "@/lib/plugins/types";

/**
 * Built-in example plugins (dev registry). No dynamic `eval` — safe to bundle.
 */
export const DEV_PLUGIN_REGISTRY: McaPlugin[] = [
  {
    id: "dev.card.tags",
    version: "0.1.0",
    capabilities: ["card_metadata"],
    extendCardMetadata: (ctx) => ({
      plugin_note: "Example metadata tag",
      cardIdSuffix: ctx.cardId.slice(0, 8),
    }),
  },
  {
    id: "dev.scoring.stamp",
    version: "0.1.0",
    capabilities: ["scoring_rules"],
    scoreFragment: () => 0.42,
  },
  {
    id: "dev.grading.overlay",
    version: "0.1.0",
    capabilities: ["grading_overlay"],
    gradingOverlayHints: (ctx) => [`demo_region:${ctx.side}`, `demo_card:${ctx.cardId.slice(0, 4)}`],
  },
];
