# Experiments (A/B buckets)

## Assignment

`src/lib/experiments/assign.ts` exports `assignExperimentVariant(userId, experimentKey, variants)` using a stable 32-bit hash. The same user always receives the same variant for a given experiment key.

## Registered experiments (code-defined)

| Key | Variants | Notes |
|-----|----------|--------|
| `binder_ui_density` | `comfortable`, `compact` | Layout density trials. |
| `trade_sheet_layout` | `v1`, `v2` | Trade detail presentation. |

Add new experiments by extending `KNOWN_EXPERIMENTS` in `src/app/api/dev/experiments/snapshot/route.ts` (and consuming the assignment in product code).

## Telemetry

| Event | When |
|-------|------|
| `experiment.assign` | Dev snapshot API records the computed variant per experiment. |
| `experiment.variant_exposure` | Emitted alongside assign for the dev snapshot surface. |

Production usage should call `assignExperimentVariant` in a server route or Server Component and emit `experiment.variant_exposure` when the user actually sees the variant.

## Panel

Open **`/dev/experiments`** (authenticated) and use **Refresh snapshot** to inspect assignments and flags.
