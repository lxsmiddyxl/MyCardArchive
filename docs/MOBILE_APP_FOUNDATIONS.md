# Mobile app foundations (PWA + offline bundles)

Phase **69** adds installable web app support and a minimal offline story without replacing the full Next.js data stack.

## Web app manifest

- **`src/app/manifest.ts`** — Next.js metadata route exporting `MetadataRoute.Manifest` (name, `start_url`, `display: standalone`, theme colors).

## Service worker

- **`public/sw.js`** — registers on the root scope in **production** only (`PwaRegister`).  
- On **install**, opens cache **`mca-offline-v1`** and prefetches **offline bundle** URLs:
  - `/feed` — app hub  
  - `/market` — marketplace shell  
  - `/community` — community shell  
  - `/binders` — binder index  
  - `/decks` — deck index  

Fetches fall back to cache when the network fails (best-effort offline read of cached shells).

## Install CTA

- **`InstallAppCta`** listens for `beforeinstallprompt` (Chromium) and offers **Install** / **Not now**.

## Telemetry

| Event | When |
|-------|------|
| `pwa.install` | User completes the install prompt (`outcome`: accepted \| dismissed). |
| `pwa.offline.bundle` | Service worker registers successfully (includes bundle route list). |

## Limitations

- Offline bundles cache **shell** HTML; authenticated API data still requires network unless separately cached by the app.  
- iOS Safari does not fire `beforeinstallprompt`; users can still add to Home Screen via the share sheet.

---

## v1 — App shell + offline navigation + background sync (Phase 74)

### App shell routing

- **`MobileAppShell`** (`src/components/mobile/mobile-app-shell.tsx`) — fixed bottom navigation on small viewports for **Feed**, **Market**, **Community**, **Trades** with `prefetch` for faster transitions.
- Wired in **`src/app/layout.tsx`** with extra bottom padding on the `<main>` so content clears the shell.

### Offline-first navigation

- **`public/sw.js`** — navigation requests use fetch-first with cache fallback; offline bundle list extended with **`/feed`** and **`/trades`**.
- **`sync`** handler registered for tag `mca-sync` (paired with client queue registration when supported).

### Background sync (client queue)

- **`src/lib/mobile/action-queue.ts`** — lightweight `localStorage` queue; on **`online`**, flushes and emits **`mobile.background_sync`** telemetry.

### Mobile-optimized surfaces

- **`touch-manipulation`** on marketplace offers, community composer, and related panels for better tap/scroll behavior on phones.

### Telemetry

| Event | When |
|-------|------|
| `mobile.app_shell` | Client: pathname changes on a mobile viewport (≤767px). |
| `mobile.background_sync` | Client: queued actions flushed after reconnect. |

---

## v2 — Full offline surfaces + Sync Center (Phase 79)

### Offline-first surfaces

| Area | Behavior |
|------|----------|
| **Binder** | Slot moves queue via `offline-action-queue`; last-known-good pages from `surface-lkg` when offline. |
| **Deck editor** | Zone changes enqueue; flush on load / `online`. |
| **Marketplace** | Card marketplace flags enqueue on network failure; existing panels unchanged. |
| **Community** | New posts can enqueue as `community_post_draft` when offline; flush when back online. |

### Sync Center

| Piece | Location |
|-------|----------|
| UI | `/mobile/sync` — queued actions, **conflict** list (dismiss), **retry history** (append-only log from `finalizeOfflineAction`). |
| Client APIs | `finalizeOfflineAction`, `listSyncRetryHistory`, `registerSyncConflict` / `resolveSyncConflict` in `src/lib/mobile/offline-action-queue.ts` |
| Navigation | `MobileAppShell` bottom bar includes **Sync**. |

### Service worker

- **`/mobile/sync`** added to the offline shell prefetch list (`public/sw.js`).

### Telemetry

| Event | When |
|-------|------|
| **`mobile.sync_center.open`** | Sync Center mounted. |
| **`mobile.sync_center.resolve`** | User dismisses a registered conflict. |

### Auth

- **`/mobile/**`** is a protected prefix in middleware (session required).

---

## v3 — Full app mode + push + offline feed (Phase 84)

### Push

- **`src/lib/mobile/web-push.ts`** — subscribes with **`NEXT_PUBLIC_VAPID_PUBLIC_KEY`** (URL-safe base64) and POSTs the subscription JSON to **`POST /api/mobile/push/register`**.
- **`public/sw.js`** — `push` handler shows a notification and **`postMessage({ type: 'mca-push' })`** to clients; client logs **`mobile.push.receive`** when the message is received.
- **`/mobile/notifications`** — **Notifications center** UI to enable push (`MobileNotificationsClient`).

### Background sync

- Sync tag **`mca-feed-market`** — best-effort **`fetch`** of **`/api/feed`** and **`/api/community/posts`** (credentials) when Periodic Background Sync / sync fires (registered from **`MobileAppShell`**).

### Offline-first feed

- **`LKG_KEY.feed`** in **`surface-lkg.ts`** — last successful **`/api/feed`** list stored in **sessionStorage**; **`GlobalFeedClient`** restores it when the network request fails.

### Shell

- Bottom nav adds **Alerts** → **`/mobile/notifications`**.

### Telemetry

| Event | When |
|-------|------|
| **`mobile.push.register`** | Client + server when subscription is created / posted (success or failure reason). |
| **`mobile.push.receive`** | Client receives SW `message` with `type: mca-push`. |
