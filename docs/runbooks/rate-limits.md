# Runbook: Rate limits (middleware)

Edge middleware applies **IP-based** sliding-window limits to specific API patterns. Other routes may rely on app logic and Supabase RLS only.

## Implementation

- **Code:** `src/middleware.ts` + `src/lib/server/rate-limit-api.ts` + `src/lib/server/rate-limit.ts`.
- **Client key:** derived from `x-forwarded-for` / `x-real-ip` (`rate-limit-api.ts`).

## Buckets (current presets)

| Bucket id | Match | Limits (`RATE_LIMITS`) |
|-----------|--------|-------------------------|
| `cards-search` | `GET /api/cards/search` | 120 / 60s |
| `deck-mut` | Non-GET `/api/decks*` | 90 / 60s |
| `binder-mut` | Non-GET `/api/binders*` | 90 / 60s |
| `pub-deck-view` | `POST …/api/public/decks/*/view` | 240 / 60s |

## Symptoms

- Users see **429** JSON: `{ "error": "Too many requests" }`.
- Legitimate bulk operations from one IP (NAT) throttled.

## Diagnosis steps

1. Confirm **429** response and response headers from `rateLimitHeaders` (reset hints in `src/lib/server/rate-limit.ts`).
2. Identify path + method in `middleware.ts`—if not listed, **no** middleware limit applies (different issue).
3. Check for accidental retry storms in client (scan, deck save loops).

## Commands / URLs

```bash
# Example: trigger search limit (careful in prod)
for i in $(seq 1 150); do curl -sS -o /dev/null -w "%{http_code}\n" "https://HOST/api/cards/search?q=pikachu"; done
```

## Expected logs

- Middleware does not log each hit; observe **application** logs if downstream returns errors after passing middleware.

## Recovery steps

1. **User blocked:** wait for window reset; reduce request frequency.
2. **False positive on shared IP:** consider raising `max` in `RATE_LIMITS` after review (code change + deploy).
3. **Abuse:** block at CDN/WAF if available; keep app limits as defense-in-depth.

## Escalation

- **P1** all users 429: misconfigured proxy headers (`x-forwarded-for` missing → single bucket key); verify load balancer forwards client IP.

## Production readiness (rate limits)

- [ ] Staging load test on `cards/search` and deck mutations approaches but does not break legitimate UX.
- [ ] Documented decision for `/api/trades` and `/api/matching` (currently **not** in middleware list).
