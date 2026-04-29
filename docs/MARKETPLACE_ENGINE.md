# Marketplace engine v1 (Phase 81)

## Purpose

Build a **trade graph** over catalog-linked **For trade (FT)** and **Looking for (LF)** rows on `cards`, then surface **best paths** and **multi-party loops** for the signed-in collector. Execution is non-binding (same as discovery and offers).

## Graph model

- **Directed edge** `(from_user_id → to_user_id, catalog_card_id)` exists when:
  - `from_user` has a row with `for_trade = true` on `catalog_card_id`, and
  - `to_user` has a row with `looking_for = true` on the same `catalog_card_id`.

This matches the edge construction in `get_market_auto_matches()` (Phase 71). The graph is **not** stored as a materialized table; it is **derived in SECURITY DEFINER RPCs** so cross-user `cards` reads remain consistent with RLS (callers never query raw cross-user rows directly).

## RPCs

| Function | Returns |
|----------|---------|
| `compute_trade_graph_for_user(p_user_id uuid default auth.uid())` | JSON: `edge_count_out`, `edge_count_in`, `edges_out_sample`, `edges_in_sample`, `best_trade_paths` (array mixing `kind: reciprocal` and `kind: two_hop`). |
| `compute_multi_party_loops(p_user_id uuid default auth.uid(), p_limit int default 24)` | JSON: `loops_3`, `loops_4` (directed cycles involving the viewer). |

**Best trade paths**

- **`reciprocal`** — same as reciprocal rows in `get_market_auto_matches`: simultaneous two-way FT/LF alignment with a partner.
- **`two_hop`** — you ship a card a middle trainer is looking for; they ship a card you are looking for (two directed edges through a third party).

**Multi-party loops**

- **3-party** — same logical pattern as `loops_3` in `get_market_auto_matches`.
- **4-party** — four distinct trainers in a directed loop (best-effort, capped).

## API

| Method | Route | Purpose |
|--------|--------|---------|
| `GET` | `/api/market/engine` | Runs both RPCs; returns `{ graph, loops }`. |

## UI

| Piece | Location |
|-------|----------|
| Engine panel | `/market` → `MarketEnginePanel` — **Best trade paths**, **Multi-party opportunities**. |

## Telemetry

| Event | When |
|-------|------|
| `market.engine.compute` | After successful graph RPC; includes edge counts and path count. |
| `market.engine.loop_detected` | When any 3- or 4-party loop row is returned. |

Migration: `059_marketplace_engine_v1_trade_graph.sql`.
