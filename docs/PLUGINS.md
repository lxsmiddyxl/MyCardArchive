# Plugin architecture (Phase 55 — foundations)

## Goals

- **Custom card metadata** — plugins can merge extra key/value data for catalog or export flows (`extendCardMetadata`).
- **Custom scoring rules** — plugins expose optional `scoreFragment` hooks for future aggregation (`scoring_rules`).
- **Custom grading overlays** — plugins return string hints consumable by grading UI (`grading_overlay`).

Plugins are **typed**, **bundled**, and **validated** — there is no runtime `eval` of user-supplied strings.

## Core types

See `src/lib/plugins/types.ts` — `McaPlugin` lists `id`, `version`, `capabilities`, and optional functions.

## Loader

`loadPluginsFromRegistry` in `src/lib/plugins/plugin-loader.ts` validates capability names and returns `{ plugins, errors }`.

`applyCardMetadataMerge` runs all metadata-capable plugins and merges objects (last write wins on key collision).

## Dev registry

- **Source:** `src/lib/plugins/registry.dev.ts` (`DEV_PLUGIN_REGISTRY`).
- **UI:** `/dev/plugins` — runs the loader client-side and fetches `GET /api/dev/plugins/inspect` (development only) to echo the same registry with server telemetry.

## Telemetry

| Event | When |
|-------|------|
| `plugin.load` | Each plugin passes validation (`pluginId`, `version`, `capabilities`). |
| `plugin.error` | Validation failure (`pluginId`, `message`). |

Emitted from `GET /api/dev/plugins/inspect` in development.

## Example: add a plugin

```ts
// registry.dev.ts
export const DEV_PLUGIN_REGISTRY: McaPlugin[] = [
  {
    id: "my.team.tags",
    version: "1.0.0",
    capabilities: ["card_metadata"],
    extendCardMetadata: (ctx) => ({ team: "example", card: ctx.cardId }),
  },
];
```

Reload `/dev/plugins` and confirm the loader lists your plugin.

## Production path

- Maintain an allowlisted registry on the server.
- Optionally persist user-enabled plugin ids per account once schema and security review are complete.
