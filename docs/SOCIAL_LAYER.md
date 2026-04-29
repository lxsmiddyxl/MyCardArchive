# Social layer (Phase 52 → Phase 61)

## Overview

MyCardArchive ships a **real social graph** (`user_follows`), **public projection tables** for safe cross-user reads, **mutual-follow projection**, **recommendations**, app-wide **presence** on public profiles, and server-backed bio / favorite sets.

## Data model

### `user_follows`

- Composite primary key `(follower_id, following_id)` referencing `profiles`.
- Constraint: no self-follow.
- **RLS**
  - `SELECT`: any authenticated user (graph is visible to signed-in clients).
  - `INSERT` / `DELETE`: only when `follower_id = auth.uid()`.

### `social_mutual_pairs` (v2)

- Canonical undirected pair `(user_low, user_high)` with `user_low < user_high`.
- Maintained by trigger on `user_follows`: row exists iff both directional edges exist.
- **RLS**: `SELECT` only if `auth.uid()` is one of `user_low` / `user_high` (you only see pairs you belong to).

### `social_public_profiles`

- One row per `profiles.id` (PK `user_id`).
- Columns: `username`, `avatar_url` (synced from `profiles` via trigger), `bio`, `favorite_sets` (jsonb array of strings), `updated_at`.
- **RLS**
  - `SELECT`: any authenticated user.
  - `INSERT` / `UPDATE`: only `auth.uid() = user_id` (own row).

### `social_collection_stats_public`

- Denormalized `card_count`, `binder_count`, `deck_count`, `trade_count`, `updated_at`.
- Maintained by RPC `refresh_social_collection_stats_for_user(uuid)` (security definer).
- **RLS**: `SELECT` for authenticated; no direct client writes.

### `social_public_activity`

- Projection of **social-relevant** rows from `activity_log`.
- Filled by trigger on `activity_log` insert + backfill migration.
- **RLS**: `SELECT` for authenticated; inserts only via trigger.

### RPCs

| Function | Purpose |
|----------|---------|
| `ensure_social_public_profile_projection(uuid)` | Upsert public profile row from `profiles` (heals missing rows). |
| `refresh_social_collection_stats_for_user(uuid)` | Recompute stats projection for one user. |
| `get_social_recommendations(integer)` | Ranked trainer suggestions (favorite-set overlap + want/have trade overlap); excludes users you already follow. |

## Routes & UI

| Path | Purpose |
|------|---------|
| `/profile` | Own profile + **Mutual follows** strip + **Recommended trainers** strip + recent activity. |
| `/profile/[userId]` | Public trainer profile: projection data, follow/unfollow, **presence** (Online/Away via app-wide Realtime presence when the shell is active), counts, bio/favorites. |

## APIs

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/api/social/profile/[userId]` | Auth required. Self: full self payload. Other: public projection + follow metadata. |
| `PATCH` | `/api/social/profile` | Auth required. Updates `bio` and/or `favoriteSets` on `social_public_profiles` for `auth.uid()`. |
| `POST` | `/api/social/follow` | Body `{ targetUserId }`. Inserts follow edge; idempotent on duplicate. |
| `POST` | `/api/social/unfollow` | Body `{ targetUserId }`. Deletes follow edge. |
| `GET` | `/api/social/recent-activity` | Last 8 rows from `social_public_activity` for the current user. |
| `GET` | `/api/social/mutuals` | Mutual trainers for `auth.uid()` (public profile fields). |
| `GET` | `/api/social/recommendations` | Query `limit` (default 12). Runs `get_social_recommendations`. |

## Telemetry (server)

| Event | When |
|-------|------|
| `social.follow.real` | Successful follow (or duplicate edge noted). |
| `social.unfollow` | Unfollow request completes. |
| `social.profile.public_view` | `GET /api/social/profile/[userId]` for another user’s id. |
| `social.profile.extras_saved` | `PATCH /api/social/profile` succeeds. |
| `social.mutuals.view` | `GET /api/social/mutuals` succeeds. |
| `social.recommendation.view` | `GET /api/social/recommendations` succeeds. |

Client also emits `social.profile.view`, `mobile.layout.switch` / `mobile.interaction` where applicable, and `social.activity.view` on activity surfaces.

## Presence

**Public profile** uses `ProfileSubjectPresence` with `useAppWidePresenceOptional()` so Online/Away appears when the page is wrapped in `AuthenticatedPresenceShell` (same Realtime “online-users” topic as the rest of the app).

## Migrations

- `042_social_graph_v1.sql` — follows + public projections + activity projection.
- `044_social_graph_v2.sql` — mutual pairs + `get_social_recommendations`.

## Future work

- Richer recommendation reasons, notification digests for new mutuals.
