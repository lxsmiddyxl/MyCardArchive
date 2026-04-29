# Changelog

All notable changes to MyCardArchive are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Phases 36–40:** Per-attempt HTTP timeouts in `fetchWithRetry`; matching **safe mode** UI after repeated load failures (`SafeModePanel`, `useSafeModeGate` telemetry); server validation telemetry (`validation.failed`) on card name length and trade message length; **`GET /api/internal/integrity/scan`** (telemetry secret or dev session) for binder/deck/trade spot-checks; **realtime** `mcaLog` events for postgres mux subscribe/retry/failure; **deck editor presence** topic (`presenceDeckEditor`) with multi-tab warning; **composite indexes** in `040_phase39_query_indexes.sql`; dashboard **What’s New** (CHANGELOG) and **Known issues** panels; **FTUE** overlays (binder, deck editor, trade new, matching, scan, grading).
- Global offline notice banner when the browser reports no connectivity.
- HTTP `fetchWithRetry` helper for grading, scan, card attach, trades, and Stripe billing calls.
- Trade detail “last known good” snapshot from `sessionStorage` when the network request fails.
- Tier comparison table, “what you unlock” copy blocks, billing history route (`/billing/history`), and Stripe checkout / portal confirmation modals with telemetry.
- Support page (`/support`) with structured diagnostics copy payload; beta welcome page (`/beta`).
- `GradingNextSteps` panel in card details after a successful grade.

### Changed

- Standardized back navigation with `NavBackLink` and hierarchy with `Breadcrumb` on binders, decks, trades, and trade creation flows.

### Launch QA (Phase 35)

- Run `npm run build` and `npm run typecheck`.
- Manually verify: binder shelf, deck editor, matching feed, trade detail (messages + actions), scan → add to binder, tier upgrade modals, billing portal link, support copy payload.
- Lighthouse: run in Chrome DevTools against `/feed`, `/binders`, `/scan`, `/tier` (performance + accessibility).
- Confirm error boundaries render on forced failures for route segments that define `error.tsx`.
