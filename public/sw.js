/* AfriPulse Times — service worker.
 *
 * Goal: offline-first and DATA-LIGHT, for readers on low-end phones and metered
 * data across Africa. The app shell is served from cache (0 bytes on repeat
 * visits) and refreshed in the background; the latest stories are cached as they
 * load so they stay readable when the network drops (or over a Starlink hotspot
 * that later disconnects). Auth and any write/API traffic always go to the network.
 *
 * Bump VERSION to ship a new shell (old caches are purged on activate).
 */
const VERSION = 'ap-v2';
const SHELL   = VERSION + '-shell';
const RUNTIME = VERSION + '-runtime';
// The public app shell is now the LITE reader (tiny, data-light). The newsroom
// desk is a second, heavier shell served only when an editor visits it — it is
// cached lazily on first visit, never precached, so readers never pay for it.
const READER_SHELL = '/reader.html';
const DESK_SHELL   = '/afripulse-preview.html';

const PRECACHE = [
  READER_SHELL,
  '/supabase-config.js',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(SHELL)
      .then(function (c) { return c.addAll(PRECACHE); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { /* a missing asset shouldn't block install */ })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys
        .filter(function (k) { return k.indexOf(VERSION) !== 0; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Let the page trigger an immediate update ( postMessage {type:'SKIP_WAITING'} ).
self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;                 // writes/RPC → network, untouched
  const url = new URL(req.url);

  // Never cache app APIs or auth — these must always be live.
  if (url.pathname.indexOf('/api/') === 0) return;
  if (url.hostname.indexOf('supabase') > -1 && url.pathname.indexOf('/auth/') > -1) return;

  // 1) Navigations → the right SPA shell. Readers (/, /reader.html, and any
  //    other path) get the lite reader; editors visiting /desk (or the raw
  //    /afripulse-preview.html) get the newsroom. Serve the cached shell
  //    instantly, refresh it in the background. Offline still opens the app.
  if (req.mode === 'navigate') {
    const isDesk = url.pathname === '/desk' ||
                   url.pathname.indexOf('/desk/') === 0 ||
                   url.pathname.slice(-DESK_SHELL.length) === DESK_SHELL;
    const shellUrl = isDesk ? DESK_SHELL : READER_SHELL;
    e.respondWith(
      caches.match(shellUrl).then(function (cached) {
        // Refresh the shell by fetching its canonical URL (never the incoming
        // path), so a hash route or the / redirect can't poison the shell cache.
        const network = fetch(shellUrl).then(function (res) {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(SHELL).then(function (c) { c.put(shellUrl, copy); });
          }
          return res;
        }).catch(function () { return cached; });
        return cached || network;
      })
    );
    return;
  }

  // 2) Supabase story reads (REST GET) → network-first so editors/readers get
  //    fresh stories, but fall back to the last cached copy when offline.
  if (url.hostname.indexOf('supabase') > -1 && url.pathname.indexOf('/rest/') > -1) {
    e.respondWith(
      fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(RUNTIME).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () { return caches.match(req); })
    );
    return;
  }

  // 3) Everything else (app html, config, icons, images, fonts, the Supabase
  //    ESM bundle) → cache-first, then network. Pays for each asset once.
  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res && (res.status === 200 || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(RUNTIME).then(function (c) { try { c.put(req, copy); } catch (e) {} });
        }
        return res;
      }).catch(function () { return cached; });
    })
  );
});
