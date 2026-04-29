/**
 * MCA spacing scale (rem). Mirrors `:root` / `html.dark` vars in `globals.css`.
 */
export const spacing = {
  /** Tailwind `0.5` step (0.125rem) — chips, counters, tight stacks */
  trace: "0.125rem",
  /** Legacy `gap-1.5` / `px-1.5` */
  micro: "0.375rem",
  xs: "0.25rem",
  sm: "0.5rem",
  /** Legacy `py-2.5` */
  tight: "0.625rem",
  /** Matches legacy `p-3` / `gap-3` (0.75rem) */
  compact: "0.75rem",
  /** Matches legacy `p-5` (1.25rem) */
  comfortable: "1.25rem",
  /** Alias: same as `md` (1rem) — `p-4` / `gap-4` */
  base: "1rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  /** Tailwind `7` step (1.75rem) */
  loft: "1.75rem",
  /** Tailwind `10` step (2.5rem) — section stacks, empty states */
  section: "2.5rem",
  "2xl": "3rem",
  /** Tailwind `14` step (3.5rem) */
  jumbo: "3.5rem",
  /** Tailwind `16` step (4rem) */
  stage: "4rem",
} as const;

/** CSS var wrappers for Tailwind `mca-*` spacing keys (runtime theming). */
export const spacingTw = {
  "mca-trace": `var(--mca-space-trace, ${spacing.trace})`,
  "mca-micro": `var(--mca-space-micro, ${spacing.micro})`,
  "mca-xs": `var(--mca-space-xs, ${spacing.xs})`,
  "mca-sm": `var(--mca-space-sm, ${spacing.sm})`,
  "mca-tight": `var(--mca-space-tight, ${spacing.tight})`,
  "mca-compact": `var(--mca-space-compact, ${spacing.compact})`,
  "mca-comfortable": `var(--mca-space-comfortable, ${spacing.comfortable})`,
  /** Same rem as `mca-md`; named for doc parity with “base” spacing */
  "mca-base": `var(--mca-space-base, ${spacing.base})`,
  "mca-md": `var(--mca-space-md, ${spacing.md})`,
  "mca-lg": `var(--mca-space-lg, ${spacing.lg})`,
  "mca-xl": `var(--mca-space-xl, ${spacing.xl})`,
  "mca-loft": `var(--mca-space-loft, ${spacing.loft})`,
  "mca-section": `var(--mca-space-section, ${spacing.section})`,
  "mca-2xl": `var(--mca-space-2xl, ${spacing["2xl"]})`,
  "mca-jumbo": `var(--mca-space-jumbo, ${spacing.jumbo})`,
  "mca-stage": `var(--mca-space-stage, ${spacing.stage})`,
} as const;
