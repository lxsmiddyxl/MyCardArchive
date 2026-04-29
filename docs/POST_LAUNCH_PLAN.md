# Post-launch plan

## Beta feedback loop

- Collect feedback in a single channel (form, Discord, or email) with a short template: surface, steps, expected vs actual, screenshots optional.
- Tag items as **bug**, **ux**, **feature**, **data** for triage.
- Acknowledge within one business day; hotfixes for data loss or security within hours.

## Issue triage

- **P0**: security, data loss, total outage — assign immediately, fix forward or roll back.
- **P1**: major flow broken (cannot save deck, cannot trade) — same-day fix or rollback.
- **P2**: incorrect UI, minor API errors with workaround — schedule within the sprint.
- **P3**: polish and nice-to-haves — backlog grooming weekly.

Use existing GitHub/GitLab labels to mirror this scheme.

## Weekly release cadence

- **Weekly** (e.g. Wednesday): ship fixes and small improvements from the backlog; keep the main branch releasable.
- **Release notes**: short bullet list in `docs/CHANGELOG.md` — user-visible changes only.
- **Regression**: run the smoke subset from `docs/LAUNCH_CHECKLIST.md` on staging before promoting.

Adjust cadence after launch based on volume; the goal is predictable, small batches rather than risky big bangs.
