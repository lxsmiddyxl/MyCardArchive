export {
  amber,
  emerald,
  mcaPalette,
  mcaSemantic,
  rose,
  sky,
  violet,
  zinc,
} from "./colors";
export type { McaSemanticKey } from "./colors";
export { radius } from "./radii";
export { strokeWidth } from "./strokes";
export { shadows } from "./shadows";
export { spacing, spacingTw } from "./spacing";

import { mcaSemantic } from "./colors";
import { radius } from "./radii";
import { shadows } from "./shadows";
import { spacingTw } from "./spacing";

/**
 * Merge into `tailwind.config` → `theme.extend` (keeps existing keys, adds `mca` colors).
 */
export const mcaTailwindExtend = {
  spacing: spacingTw,
  boxShadow: {
    "mca-card": shadows.mcaCard,
    "mca-panel": shadows.mcaPanel,
  },
  borderRadius: {
    "mca-card": radius.mcaCard,
    "mca-panel": radius.mcaPanel,
    "mca-block": radius.mcaBlock,
    "mca-sheet": radius.mcaSheet,
    "mca-control": radius.mcaControl,
    "mca-pill": radius.mcaPill,
  },
  colors: {
    mca: mcaSemantic,
  },
} as const;
