# Backup, restore, and disaster recovery

## Supabase backups

- Enable **Point-in-Time Recovery (PITR)** on production projects (Supabase Pro and above). Confirm retention matches your compliance window.
- Take logical exports before major migrations (`pg_dump` / Supabase dashboard backup) and store them outside the primary region.

## Application data

- **Stripe**: use Stripe Dashboard exports and webhook event logs for billing disputes.
- **Object storage**: if you add user uploads beyond Supabase defaults, mirror critical buckets to a second region or vendor.

## Restore drill (quarterly)

1. Restore a PITR fork or staging clone from a timestamp **T**.
2. Run `npm run test:unit` and smoke E2E against the clone.
3. Document actual RTO/RPO achieved vs target.

## Integrity after restore

- Run `GET /api/internal/integrity/scan` (development or with `x-internal-telemetry-secret`) against the restored project for a known test user.

## Contacts

- Primary on-call: update `docs/runbooks/incidents.md` with your roster.
