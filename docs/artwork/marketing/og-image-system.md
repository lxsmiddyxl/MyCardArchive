# OG image system (`/og`)

## Route handler

Dynamic Open Graph images are served at **`GET /og`**. The implementation lives in **`src/app/og/route.tsx`** (TypeScript + JSX is required for `ImageResponse` from `next/og`; a plain `route.ts` file cannot contain JSX).

## Behavior

1. Reads query parameters:
   - **`title`** — main headline (default from `OG_DEFAULT_TITLE` or `"MyCardArchive"`).
   - **`subtitle`** — secondary line (default from `OG_DEFAULT_SUBTITLE` or a short product tagline).
   - **`theme`** — `light` or `dark` (default `dark`).
2. Loads from disk (Node runtime):
   - `og-template-base.png`
   - `og-template-light.png` or `og-template-dark.png` depending on `theme`
   - `og-logo.svg`
3. Composites layers and text with `@vercel/og` / Satori via `ImageResponse` at **1200×630** (`OG_SIZE` in `src/lib/og/mca-og-image.tsx`).
4. On read/compose failure, returns **`mcaOgFallbackImageResponse()`** (existing MCA OG fallback).

## Example URLs

```
/og?title=MyCardArchive&subtitle=Your+collection%2C+organized+in+binders&theme=dark
/og?theme=light&title=Feature+spotlight
```

## Updating templates

1. Replace files under `/public/artwork/marketing/og/` **keeping the same filenames**, **or**
2. Update paths in `ARTWORK_OG` inside `src/lib/ui/artwork-tokens.ts` if filenames change.

Preload keys used in the app: `og.base`, `og.light`, `og.dark`, `og.logo` (see `preloadOGTemplates()` in `useArtwork.ts`).

## Relation to other OG routes

Per-route **`opengraph-image.tsx`** files (decks, binders, etc.) use `mcaOgImageResponse` from `src/lib/og/mca-og-image.tsx`. The **`/og`** route is the **template-based** marketing OG endpoint for generic share links and testing.
