# Pre-launch QA matrix (v1.0.0-rc1)

Use this checklist before promoting an RC build. Track failures in your issue tracker with the route label.

## Binder

- [ ] `/binders` list loads; empty state renders without errors.
- [ ] Create binder (tier limits respected); open binder detail; add-card flow reachable.

## Deck

- [ ] `/decks` list loads; create / rename / delete modals complete without console errors.
- [ ] `/decks/[deckId]` loads stats and card list; legality panel does not hard-crash offline.

## Trade

- [ ] `/trades` dashboard loads; list empty state OK.
- [ ] `/trades/new` validates counterparty UUID (Zod); create draft when permitted.
- [ ] `/trades/[tradeId]` messages and items load; realtime banner recovers after reconnect.

## Profile

- [ ] `/profile` redirects unauthenticated users to sign-in with `next` preserved.
- [ ] `/profile/[id]` public view loads for a known profile id.

## Catalog

- [ ] `/catalog` lists sets; `/catalog/[setId]` opens; search under `/catalog/cards/search` returns.

## Auth

- [ ] Sign-in, sign-up, password reset happy paths; email confirmation links do not loop.

## Regression gates (automated)

- [ ] `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [ ] CI workflow green on the RC-tagged commit.
