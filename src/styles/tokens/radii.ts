/**
 * Border radius tokens (rem). Wired to Tailwind `rounded-mca-*` and documented
 * alongside ARTWORK_STYLE_GUIDE “soft geometry” (12–32px feel at 1rem base).
 */
export const radius = {
  /** Cards, compact panels */
  mcaCard: "0.75rem",
  /** Section panels */
  mcaPanel: "0.75rem",
  /** Legacy `rounded-lg` (8px)—list rows, notification items */
  mcaBlock: "0.5rem",
  /** Legacy `rounded-2xl` / large sheets */
  mcaSheet: "1rem",
  /** Controls, header chips */
  mcaControl: "0.375rem",
  /** Small pills, badge-like surfaces */
  mcaPill: "0.25rem",
} as const;
