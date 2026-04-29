# Marketing artwork (Phase 25)

## Files

| File | `viewBox` | Suggested PNG export |
|------|-----------|-------------------------|
| `marketing-home-hero.svg` | 1920×640 | **1920×640** (hero band, CMS, static landing) |
| `marketing-dashboard-hero.svg` | 1600×480 | **1600×480** (in-app or product pages) |
| `marketing-collection-feature.svg` | 640×400 | **1280×800** @2x for crisp feature blocks |
| `marketing-trading-feature.svg` | 640×400 | same as above |
| `marketing-scan-feature.svg` | 640×400 | same as above |

## PNG export

1. Open the `.svg` in Figma, Illustrator, or Inkscape.
2. Set the artboard to match the native `viewBox` (or scale proportionally for a larger master).
3. Export **PNG @1x** and **@2x** where marketing or email requires raster.
4. Prefer **SVG** in the web app for scalability; use PNG when a CMS or ad platform requires it.

## Notes

- **No embedded marketing copy** in these files — headlines and CTAs belong in HTML or the OG route.
- Palette aligns with `ARTWORK_STYLE_GUIDE.md`: zinc surfaces, emerald accents, amber highlights.
- `role="img"` and `<title>` support accessibility; treat artwork as decorative when paired with visible text.
