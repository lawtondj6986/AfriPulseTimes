# Architecture

AfriPulse Times is a static single-page front end plus a thin serverless
backend, with Supabase as the system of record. There is no application server
to run — the browser talks to Supabase directly (guarded by Row Level Security),
and a couple of Vercel functions handle the two jobs that must run with elevated
privileges (RSS ingestion and newsletter signup).

## System diagram

```
                         ┌──────────────────────────────────────────┐
                         │                Vercel                     │
                         │                                           │
  ┌──────────┐   HTTPS   │  Static site            Serverless /api   │
  │ Visitor  │──────────▶│  ┌───────────────────┐  ┌──────────────┐  │
  │ browser  │           │  │ afripulse-preview │  │ pull-wire.js │  │
  │  (SPA)   │◀──────────│  │ .html (SPA)       │  │ subscribe.js │  │
  └────┬─────┘   assets  │  │ supabase-config.js│  └──────┬───────┘  │
       │                 │  └───────────────────┘         │          │
       │                 │            ▲ Cron daily ────────┘          │
       │                 └────────────┼──────────────────────────────┘
       │                              │ (service-role key, server-only)
       │ anon key + JWT               │
       │ (Row Level Security)         │
       ▼                              ▼
  ┌─────────────────────────────────────────────┐        ┌──────────────────┐
  │                 Supabase                     │        │   RSS sources    │
  │  Postgres: articles, authors, verticals,     │        │ (BBC, AllAfrica, │
  │        regions, rss_sources, subscribers,    │◀───────│  TechCabal, …)   │
  │        leads                                 │        │                  │
  │  Auth: magic-link email                      │ fetch  └──────────────────┘
  │  RLS: anon reads published; auth writes      │         (server-side only)
  └─────────────────────────────────────────────┘
       ▲                              │
       │ SDK from esm.sh CDN          │ /api/subscribe forwards signups
       │ (browser loads the client)   ▼
  ┌──────────────┐            ┌──────────────────┐
  │ Google Fonts │            │   Buttondown     │
  │ Unsplash etc │            │  (email list)    │
  └──────────────┘            └──────────────────┘
```

## Components

| Component | Runs where | Auth identity | Responsibilities |
|---|---|---|---|
| SPA (`afripulse-preview.html`) | Browser | anon key, or user JWT after login | UI, routing, read/write articles, admin CMS, newsletter form |
| `supabase-config.js` | Browser | — | Creates the browser Supabase client from the **public** anon key |
| `/api/pull-wire.js` | Vercel function | service-role key / CRON_SECRET | Fetch + parse RSS, dedupe, insert articles |
| `/api/subscribe.js` | Vercel function | service-role key | Validate email, insert subscriber, push to Buttondown |
| `/api/translate.js` | Vercel function | service-role key / CRON_SECRET | Translate published articles into FR + AR via Claude |
| `/api/contact.js` | Vercel function | service-role key | Validate + insert investor/partner enquiries into `leads` |
| Supabase | Managed | — | Postgres, RLS, magic-link auth |
| Vercel Cron | Vercel | CRON_SECRET | Daily: `/api/pull-wire` 06:00 UTC, `/api/translate` 06:30 UTC |
| Buttondown | Managed | API key | Newsletter list / delivery |

## Trust boundaries

- **Public (shippable):** the anon key lives in the browser. RLS makes it safe —
  anonymous clients can only `SELECT` published articles (plus the public
  taxonomy tables) and cannot write.
- **Server-only (secret):** the service-role key and `BUTTONDOWN_API_KEY` exist
  **only** in Vercel function env. They bypass RLS, so they never touch the
  browser bundle.
- **Admin:** writing articles requires a Supabase session (magic-link). RLS
  policies grant `INSERT/UPDATE/DELETE` on `articles` to the `authenticated`
  role only.

## Data flows (the three core actions)

### 1. Visitor reads an article

```
Browser SPA
  └─ supabase.from('articles').select('*')        (anon key)
       └─ Supabase RLS: "Public read published articles"  → returns status='published' rows only
  └─ SPA renders from the row's `payload` (full article object) ; caches in localStorage
```

The SPA paints instantly from a localStorage cache, then refreshes from Supabase.
Drafts are invisible to anonymous readers because RLS filters them out server-side.

### 2. Editor publishes an article

```
Editor visits #/admin
  └─ Not signed in?  → magic-link login form → Supabase sends email → click link
       └─ onAuthStateChange restores the intended #/admin route (authenticated session)
  └─ Edits article, sets status='published', clicks Save
       └─ supabase.from('articles').upsert(row, {onConflict:'slug'})   (user JWT)
            └─ RLS: "Authenticated insert/update articles" → allowed
  └─ Visitors now see it via flow #1
```

Delete is the same path through `supabase.from('articles').delete()`, allowed
only for the `authenticated` role.

### 3. Cron pulls RSS

```
Vercel Cron (*/15 * * * *)
  └─ GET /api/pull-wire   (Authorization: Bearer CRON_SECRET)
       └─ service-role client:
            1. read rss_sources WHERE active = true
            2. for each: rss-parser.parseURL(feed)            (server-side fetch, no CORS proxy)
            3. dedupe items against existing articles by source_url
            4. upsert new items into articles (status='published', source='rss')
            5. stamp rss_sources.last_fetched_at
       └─ logs per-feed OK/FAIL + a summary (visible in Vercel function logs)
  └─ Visitors pick up new wires via flow #1
```

The admin "Pull live wire" button hits the same endpoint with the editor's JWT
(instead of `CRON_SECRET`); anonymous visitors just re-read from the database.

## Notable design choices

- **Static SPA, no bundling of the page.** `afripulse-preview.html` is served
  byte-for-byte from `public/`. The Supabase JS SDK is loaded in the browser from
  the esm.sh CDN by `supabase-config.js`, which is generated from `VITE_` env vars
  at build time.
- **`articles.payload` (jsonb).** The front-end article model is richer than the
  typed columns (kicker, byline, tags, media, body-as-array…). The full object is
  stored in `payload` for lossless rendering; the typed columns mirror the
  queryable subset used by RLS and the API.
- **Seeded taxonomy tables.** `verticals`, `regions`, and `authors` are seeded in
  the schema. The current SPA still renders these from in-file constants; the
  tables exist for future server-side use and are safe to read publicly.
