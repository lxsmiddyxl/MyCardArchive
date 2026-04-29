/**
 * MyCardArchive color tokens — Tailwind-default zinc / emerald / amber scales
 * (see ARTWORK_STYLE_GUIDE.md). Use `mcaSemantic` for theme extensions; use
 * `mcaPalette` for chart/canvas hex in TSX or non-Tailwind contexts.
 */
export const zinc = {
  50: "#fafafa",
  100: "#f4f4f5",
  200: "#e4e4e7",
  300: "#d4d4d8",
  400: "#a1a1aa",
  500: "#71717a",
  600: "#52525b",
  700: "#3f3f46",
  800: "#27272a",
  900: "#18181b",
  950: "#09090b",
} as const;

export const emerald = {
  100: "#d1fae5",
  200: "#a7f3d0",
  300: "#6ee7b7",
  400: "#34d399",
  500: "#10b981",
  600: "#059669",
  700: "#047857",
  800: "#065f46",
  900: "#064e3b",
  950: "#022c22",
} as const;

export const amber = {
  100: "#fef3c7",
  200: "#fde68a",
  300: "#fcd34d",
  400: "#fbbf24",
  500: "#f59e0b",
  600: "#d97706",
  700: "#b45309",
  800: "#92400e",
  900: "#78350f",
  950: "#451a03",
} as const;

/** Tailwind-default rose (error / destructive). */
export const rose = {
  100: "#ffe4e6",
  200: "#fecdd3",
  300: "#fda4af",
  400: "#fb7185",
  500: "#f43f5e",
  600: "#e11d48",
  700: "#be123c",
  800: "#9f1239",
  900: "#881337",
  950: "#4c0519",
} as const;

/** Tailwind-default sky (info / water accent). */
export const sky = {
  200: "#bae6fd",
  400: "#38bdf8",
  500: "#0ea5e9",
  600: "#0284c7",
  950: "#082f49",
} as const;

/** Tailwind-default violet (psychic / portal-style accents). */
export const violet = {
  100: "#ede9fe",
  200: "#ddd6fe",
  300: "#c4b5fd",
  400: "#a78bfa",
  500: "#8b5cf6",
  600: "#7c3aed",
  900: "#4c1d95",
} as const;

/** Raw scales for imports (charts, OG-related TS in future refactors). */
export const mcaPalette = { zinc, emerald, amber, rose, sky, violet } as const;

/**
 * Semantic aliases → Tailwind `mca-*` color utilities (`border-mca-border`, etc.).
 * Values match previous `border-zinc-800`, `text-zinc-400`, … usage.
 */
export const mcaSemantic = {
  border: zinc[800],
  borderSubtle: zinc[700],
  surface: zinc[950],
  surfaceElevated: zinc[900],
  ink: zinc[50],
  inkMuted: zinc[400],
  inkSubtle: zinc[500],
  /** Inputs, chrome borders */
  fieldBorder: zinc[600],
  fieldSurface: zinc[950],
  accent: amber[400],
  accentStrong: amber[500],
  focus: emerald[500],
  focusSoft: emerald[600],
  /** Inline chart text (legacy exact hues for ScanActivityChart) */
  chartAxis: "#737373",
  chartValue: "#a3a3a3",
  /** Text ramp (maps former zinc-100 … zinc-600) */
  inkStrong: zinc[100],
  inkSoft: zinc[200],
  inkBody: zinc[300],
  hint: zinc[600],
  /** Interactive chrome layers */
  chrome: zinc[800],
  /** Hover outline / secondary borders (zinc-500) */
  borderInteractive: zinc[500],
  /** Primary CTA accents */
  accentBorder: amber[600],
  onAccent: zinc[950],
  accentHighlight: amber[300],
  /** Nav / dropdown active row */
  navAccent: amber[200],
  /** Positive / success (replaces text-emerald-*, bar fills) */
  success: emerald[400],
  successSoft: emerald[300],
  successInk: emerald[200],
  successBold: emerald[500],
  /** Light-mode shells (marketing / public deck) — former zinc-50 … 300 */
  surfaceLight: zinc[50],
  surfacePaper: zinc[100],
  borderLight: zinc[200],
  borderLightStrong: zinc[300],
  /** Status wells (former emerald-/amber-950 & 900 borders) */
  successSurface: emerald[950],
  successSurfaceBorder: emerald[900],
  successBorder: emerald[900],
  warningSurface: amber[950],
  warningSurfaceBorder: amber[900],
  warningBorder: amber[900],
  accentDeep: amber[700],
  successText: emerald[900],
  successTint: emerald[100],
  warningText: amber[900],
  warningTint: amber[100],
  neutralDot: zinc[600],

  /** Error / destructive (rose) */
  errorSurface: rose[950],
  errorBorder: rose[900],
  errorBorderStrong: rose[800],
  errorBorderMuted: rose[700],
  errorText: rose[200],
  errorTextMuted: rose[300],
  errorTextStrong: rose[100],
  errorAccent: rose[400],
  errorFocus: rose[400],
  /** Stronger error edge (former `rose-500` borders / banners) */
  errorBright: rose[500],

  /** Info (sky) */
  infoSurface: sky[950],
  infoBorder: sky[600],
  infoText: sky[200],
  infoAccent: sky[400],
  infoBar: sky[500],

  /** Portal / psychic / violet chrome */
  violetSurface: violet[600],
  violetBorder: violet[500],
  violetText: violet[100],
  violetTextMuted: violet[200],
  typePsychic: violet[500],
  typePsychicTint: violet[100],
  typePsychicInk: violet[900],
  typePsychicSoft: violet[200],
  /** Dev / secondary violet label */
  violetAccent: violet[400],

  /** Elemental dots (deck stats) — matches prior sky/violet utility hues */
  typeWater: sky[500],
} as const;

export type McaSemanticKey = keyof typeof mcaSemantic;
