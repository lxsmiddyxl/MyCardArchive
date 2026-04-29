# Phases (index)

Feature work is described in commits, PRs, and operational docs—not a single narrative file. The rows below summarize **engineering phases** referenced in tooling and docs (not product roadmap dates).

| Phase | Topic | Where to look |
|-------|---------|----------------|
| 1–7 | Realtime trading (037–039), telemetry consolidation (`mcaLog`), tier artwork, heuristic grading, predictive cleanup, E2E smoke | `docs/runbooks/realtime.md`, `docs/runbooks/observability.md`, `docs/artwork/artwork-tokens.md`, `src/lib/grading/`, prior release notes |
| **8** | ESLint / React Hooks — exhaustive-deps cleanup, `useMcaContextRef` | `src/lib/telemetry/use-mca-context-ref.ts`, trading & notification clients |
| **9** | Authenticated Playwright — login fixture, shell smoke | `tests/e2e/fixtures/auth.ts`, `tests/e2e/authenticated.spec.ts`, env `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` |
| **10** | Realtime regression — Vitest merge helpers | `src/lib/trading/trade-realtime.test.ts`, `npm run test:unit` |
| **11** | Error boundaries audit — segment `error.tsx` + `LoggedRouteError` | `src/components/logged-route-error.tsx`, `src/app/*/error.tsx` |
| **12** | Documentation pass | This file, `docs/ARCHITECTURE.md`, runbooks |
| **13** | UI polish & consistency | Ongoing — design tokens, `@/mca-ui` vs `@/components/ui`, virtualized lists |
| **14** | Maintenance & monitoring | `MAINTENANCE_MODE` in `src/middleware.ts`, `docs/runbooks/maintenance-mode.md`, `docs/runbooks/monitoring-surface.md` |

| Topic | Where to look |
|-------|----------------|
| Maintenance / API 503 | `docs/runbooks/maintenance-mode.md`, `MAINTENANCE_MODE` |
| Observability & health endpoints | `docs/runbooks/observability.md`, `src/app/api/health/` |
| Stability & recovery flags | `docs/runbooks/observability.md` (health/stability section), `src/lib/recovery/` |
| Deployment checklist | `docs/deployments/checklist.md` |

If you add a formal phase log, extend this file or link an external doc from here.
