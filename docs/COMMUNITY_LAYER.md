# Community layer (Phase 65)

## Purpose

Lightweight, **non-transactional** posts for collectors: discussion, tips, and hobby content. **Trades and marketplace execution** remain on Trades, Matching, and Marketplace.

## Schema

| Table | Notes |
|-------|--------|
| `community_posts` | `author_id`, `body` (≤ 8000 chars), timestamps. |
| `community_post_likes` | `(post_id, user_id)` composite PK. |
| `community_post_comments` | `post_id`, `author_id`, `body` (≤ 4000 chars). |

RLS: authenticated users can read all posts/likes/comments; authors can insert/update/delete their own rows.

Migration: `047_community_layer.sql`.

## API

| Method | Route | Purpose |
|--------|--------|---------|
| `GET` | `/api/community/posts` | Feed (newest first) with like counts, comment counts, `liked_by_viewer`, author display from `social_public_profiles`. |
| `POST` | `/api/community/posts` | Create post (`{ body }`). |
| `PATCH` | `/api/community/posts/[postId]` | Edit own post. |
| `DELETE` | `/api/community/posts/[postId]` | Delete own post. |
| `POST` | `/api/community/posts/[postId]/like` | Toggle like. |
| `GET` | `/api/community/posts/[postId]/comments` | List comments. |
| `POST` | `/api/community/posts/[postId]/comments` | Add comment (`{ body }`). |

## UI

- **Feed**: `/community` — composer + `CommunityFeedClient` (posts, like, comment thread per post when expanded).

## Telemetry

| Event | When |
|-------|------|
| `community.post` | Server: successful post create. |
| `community.like` | Server: like toggle (`action`: `like` \| `unlike`). |
| `community.comment` | Server: comment created. |

## Routing

- `/community` is **auth-protected** (middleware), same pattern as `/market`.

---

## v2 — Reactions, threaded replies, moderation (Phase 80)

### Schema

| Table / change | Notes |
|----------------|--------|
| `community_post_reactions` | `(post_id, user_id, reaction)` PK — emoji set 👍 ❤️ 🔥 😂 🎉. |
| `community_post_comments` | `parent_comment_id` (self-FK) for **one-level threads**; `hidden` for moderation. |

### RPC

- **`community_set_comment_hidden(p_comment_id, p_hidden)`** — **post author** toggles visibility of a comment on their thread (`SECURITY DEFINER`).

### API

| Method | Route | Purpose |
|--------|--------|---------|
| `GET` | `/api/community/posts` | Adds `reaction_counts` + `viewer_reactions` per post. |
| `GET` / `POST` | `/api/community/posts/[postId]/reactions` | Read counts / **toggle** a reaction. |
| `POST` | `/api/community/posts/[postId]/comments` | `{ body, parent_comment_id? }` for threaded replies. |
| `POST` | `/api/community/posts/[postId]/comments/[commentId]/hide` | `{ hidden?: boolean }` — post owner moderation. |

### UI

- `/community` — emoji reactions, nested comment display, Reply, Hide/Unhide for post owners.

### Telemetry

| Event | When |
|-------|------|
| **`community.reaction`** | Reaction toggled. |
| **`community.thread`** | Comment created with a parent (threaded reply). |
| **`community.moderation`** | Comment hidden/unhidden via RPC. |

Migration: `058_community_v2_reactions_threads_moderation.sql`.
