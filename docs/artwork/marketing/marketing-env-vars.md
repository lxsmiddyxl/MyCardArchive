# Marketing / OG environment variables

Optional defaults for the **`GET /og`** handler when query parameters are omitted.

## `OG_DEFAULT_TITLE`

- **Used when:** `title` query param is missing or empty.
- **Typical value:** `MyCardArchive` or a short product name.
- **Consumed in:** `src/app/og/route.tsx`.

## `OG_DEFAULT_SUBTITLE`

- **Used when:** `subtitle` query param is missing or empty.
- **Typical value:** One line describing the product (e.g. collection / binders).
- **Consumed in:** `src/app/og/route.tsx`.

## `NEXT_PUBLIC_SITE_URL`

- Not required for `/og` file reads (templates load from `public/` via `fs`).
- Use elsewhere for absolute URLs in metadata and canonical links.
