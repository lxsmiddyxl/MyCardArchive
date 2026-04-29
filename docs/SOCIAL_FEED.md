# Social feed (global, ranked)

Phase **67** introduces a **global activity feed** for signed-in users: a single stream that merges community activity and marketplace signals.

## Projection

Table **`feed_events`** stores normalized rows (kind, actor, subject, payload, timestamps). Rows are populated via triggers on:

- Community posts, likes, comments  
- Follow relationships  
- Marketplace offer timeline events  

Clients **do not** insert into `feed_events` directly; RLS allows **select** for authenticated users.

## Ranking

RPC **`get_global_feed(p_limit, p_before)`** returns a cursor-paginated list with server-side scoring that blends:

- **Recency** — newer events rank higher.  
- **Mutuals** — activity from users you follow who also follow you gets a boost.  
- **Relevance** — kind- and payload-aware ordering within the window.

## API & UI

- **`GET /api/feed`** — calls `get_global_feed`, returns `{ items }`.  
- **`/feed`** — renders the ranked stream (`GlobalFeedClient`).

## Telemetry

| Event | When |
|-------|------|
| `feed.view` | Each successful feed API request (includes viewer and limit). |
| `feed.rank.compute` | Emitted with the same request after RPC returns (includes item count). |

See migration `049_global_feed_projection.sql`.
