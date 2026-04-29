# Feature flags

## Public (client-build) flags

Declared in `src/lib/feature-flags/public.ts` as **`NEXT_PUBLIC_MCA_FF_<NAME>=1|true`** so values are inlined at build time.

| Key | Variable | Purpose |
|-----|----------|---------|
| `MARKETPLACE` | `NEXT_PUBLIC_MCA_FF_MARKETPLACE` | Optional UI gates for marketplace experiments. |
| `MOBILE_TABS` | `NEXT_PUBLIC_MCA_FF_MOBILE_TABS` | Reserved for bottom-tab navigation tests. |

Read via `getKnownPublicFeatureFlags()` (server or client).

## Server-only flags

`src/lib/feature-flags/server.ts` — **`MCA_FF_<NAME>=1|true`** (never `NEXT_PUBLIC_*`). Use for ingestion probes, internal tooling, or staged APIs.

## Dev

`/dev/experiments` shows a merged snapshot including public keys and a sample server flag (`serverBillingProbe` → `MCA_FF_BILLING_PROBE`).
