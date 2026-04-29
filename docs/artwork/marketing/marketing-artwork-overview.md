# Marketing artwork overview (Phase 24)

## Hero art philosophy

Marketing heroes use **branded raster plates** (light and dark) under `/public/artwork/marketing/hero/`, layered with **motifs** and optional **soft vignette** so copy stays readable. Assets are referenced only through **`artwork-tokens.ts`** so filenames can be swapped for production art without touching feature code.

## Light / dark variants

- **Landing** — `hero-landing-light.png` / `hero-landing-dark.png`, toggled with `dark:` / `hidden` classes so the correct plate shows for the active theme without client-side theme detection.
- **Dashboard** — `hero-dashboard-light.png` / `hero-dashboard-dark.png` behind the “Where to next” block, same pattern.

Token keys: `hero.landing.light`, `hero.landing.dark`, `hero.dashboard.light`, `hero.dashboard.dark`.

## Motif usage

| Component | Asset | Role |
|-----------|--------|------|
| `McaRadiantMotif` | `motifs.radiant` | Soft radial wash behind landing headlines |
| `McaHoloGridMotif` | `motifs.holoGrid` | Grid overlay on dashboard hero |
| `motif-arc.svg` | `motifs.arc` | Available for future strips / dividers |

Marketing textures (`textures.holoGradient`, `textures.softVignette`) support gradients and vignette overlays; landing uses **soft vignette** on the hero.

## Preloading

- **Landing** — `(marketing)/layout.tsx` mounts `ArtworkWarmLanding` (hero + motifs + OG templates).
- **Dashboard** — `dashboard/layout.tsx` mounts `ArtworkWarmDashboard` (core shell assets + hero + motifs + OG).

See `marketing-env-vars.md` for optional OG defaults.
