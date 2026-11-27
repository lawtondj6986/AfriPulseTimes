# AfriPulse Times — Progressive Web App (Phase 0 of mobile)

The site is now an **installable, offline-first PWA** — the cheapest, highest-reach
first step for a data-constrained African audience (85% have a signal, but data
cost keeps most offline; entry phones are low-end and storage-tight). No app store
needed; one codebase; instant updates.

## What it does
- **Installable.** Android/Chromium show an "📲 Install AfriPulse" pill (dismissible);
  iOS installs via **Share → Add to Home Screen**. Launches full-screen from the
  home icon, its own gold-Africa app icon.
- **Data-light.** On repeat visits the ~400 KB app shell is served from cache
  (0 bytes), then refreshed in the background — readers pay for each asset once.
- **Offline reading.** The latest stories are cached as they load, so the app
  still opens and reads when the network drops (or a shared/Starlink hotspot
  disconnects). Verified: reload while fully offline still renders the app.

## Files
- `public/manifest.webmanifest` — name, icons, theme, standalone display.
- `public/sw.js` — the service worker (bump `VERSION` to ship a new shell).
  Strategy: shell = stale-while-revalidate; Supabase story reads = network-first
  with cache fallback; auth + `/api/*` writes = always network; other assets
  (icons, images, fonts, the Supabase ESM bundle) = cache-first.
- `public/icons/*` — app icons (192/512/maskable/180), rasterized from an
  Africa + pulse mark.
- Registration + install prompt live at the end of `public/afripulse-preview.html`.
- `vercel.json` — `sw.js`/`manifest` set to `must-revalidate` (fast updates);
  `/icons/*` cached a week.

## Verify
`node scratchpad/pwa-test.mjs` (headless): SW registers/activates/controls, manifest
+ icons valid, and the app opens **offline** after a reload — 14/14.

## Next (later phases, see the mobile strategy doc)
Play Store via TWA (Bubblewrap) · WhatsApp/Telegram auto-broadcast on approve ·
SMS/USSD digest for the offline majority · Starlink community-hotspot sync points.
