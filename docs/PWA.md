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

## Two surfaces, one PWA (Reader-Lite)
Phones now land on a **lite reader** built for entry Android on prepaid data;
editors keep the full newsroom. Both read the same Supabase `articles` and share
the same manifest, icons, and service worker.

| Path | Serves | Who |
|------|--------|-----|
| `/` → `/reader.html` | Lite reader (~53 KB, system fonts, no web fonts/images on first paint) | Phones / public |
| `/desk` → `/afripulse-preview.html` | Full newsroom + Command Center | Editors |

The reader is the installed **app shell** (`start_url` = `/reader.html`). Its tabs:
**Today** (edition grouped by section), **Pulse** (tappable SVG Africa map, filter
by region), **Listen** (on-device Web-Speech "Morning Pulse", no data), **Saved**
(offline bookmarks), **Me** (language · text size · data saver · install help ·
cache size · link to the desk). A **data-saver** toggle drops images from the
edition fetch; the edition pack is cached text-only and reads fully offline.

## Files
- `public/reader.html` — the lite reader PWA (standalone vanilla, no build step).
- `public/afripulse-preview.html` — the newsroom desk (left unchanged; reachable
  at `/desk`).
- `index.html` — redirects `/` → `/reader.html` (belt-and-braces; once the SW is
  installed it serves the reader shell for `/` with no redirect hop).
- `public/manifest.webmanifest` — `id`/`start_url` = `/reader.html`.
- `public/sw.js` — the service worker, **`VERSION = 'ap-v2'`** (bump to ship a new
  shell). Navigations are surface-aware: `/desk` (and the raw newsroom URL) get the
  **desk** shell, everything else gets the **reader** shell. Only the lite reader is
  precached — the 413 KB newsroom is cached lazily on an editor's first `/desk`
  visit, so readers never pay for it. Supabase story reads = network-first with
  cache fallback; auth + `/api/*` = always network; other assets = cache-first.
- `public/icons/*` — app icons (192/512/maskable/180).
- `vercel.json` — `/desk` rewrite to the newsroom; `reader.html`/`sw.js`/`manifest`
  set to `must-revalidate` (fast updates); `/icons/*` cached a week.

## Verify
`npm test` → `tests/reader.test.mjs` covers the reader parse, five-language i18n
completeness, placeholder consistency, the v2 reader shell, the `/` + manifest +
`/desk` routing, and that the desk is left intact (74/74 across the repo).

## Next (later phases, see the mobile strategy doc)
Play Store via TWA (Bubblewrap) · WhatsApp/Telegram auto-broadcast on approve ·
SMS/USSD digest for the offline majority · Starlink community-hotspot sync points.
