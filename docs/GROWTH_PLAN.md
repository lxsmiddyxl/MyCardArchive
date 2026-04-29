# Post-launch growth foundations

## In-product surfaces

- **Announcements** — lightweight panel (dismissible, stored per id in `localStorage`) for release notes and campaigns.
- **Feedback** — modal to send product feedback; posts to `/api/feedback` and logs structured telemetry.
- **NPS-style prompts** — optional “How was this feature?” 1–5 control; dismissed state persisted locally.

## Telemetry

| Event | When |
|-------|------|
| `announcement.view` | Announcement panel becomes visible |
| `announcement.dismiss` | User dismisses an announcement |
| `feedback.submit` | Feedback form submitted successfully |
| `growth.nps.submit` | NPS-style score submitted |

## Onboarding improvements

- Tie FTUE overlays to feature areas already in the app (binders, decks, matching, scan).
- Use announcements for “What’s new” without blocking primary tasks.

## Retention loops

- Weekly digest email (outside this repo) can deep-link to binders/trades.
- In-app announcements for limited-time events or tier upgrades.

## Weekly release cadence

- Ship small batches weekly; document user-visible changes in `docs/CHANGELOG.md`.
- Announce in-product only when the change affects workflows (navigation, limits, pricing).

## Feature flagging strategy

- Prefer **environment** and **build-time** flags for large behavior changes (`NEXT_PUBLIC_*`, `REGION_FAILOVER_ENABLED`, stability overlays).
- For per-user experiments, introduce a server-backed profile flag when needed; avoid forking core RLS paths without review.
