# AfriPulse Times

**The continent's voice** — a pan-African news platform live at
[afripulsetimes.com](https://afripulsetimes.com): real-time, editor-verified
coverage of all 54 African nations in **five languages** (EN / FR / AR / SW / PT),
engineered for the phones Africans actually own — low-end, prepaid, and often
offline.

Two static surfaces over one Supabase backend:

- **`/` — the phone-first reader** (`public/reader.html`, ~60 KB): installable
  offline PWA with the day's edition, a tappable Africa map, a spoken briefing,
  saved stories, offline search, and light/dark "paper" themes.
- **`/desk` — the newsroom** (`public/afripulse-preview.html`): the editor
  Command Center (named-editor verification on every story), the public About
  page, media kit, and reader accounts.

## What the reader does

Everything below runs in `public/reader.html`, in all five languages, with no
backend beyond the published-articles query. Personal data (reading diary,
streak, home region, last visit) stays in the browser's `localStorage`.

| Area | Feature |
|---|---|
| First open | Welcome screen with language choice, each language in its own name |
| Today | Cover story with photo, section chips, exchange rates, "Near you" for the reader's home region, favourite sections first, NEW badges since the last visit, read ticks, freshness line |
| Finding stories | Instant offline search of the edition, archive search across every headline, "Load earlier stories", browse by nation with flags, regional map |
| Reading | Photos with credits, progress bar, "Up next", edition meter and finish line, swipe between stories, read-aloud at three speeds, wire source credit with a link to the original, a note when a story is not yet translated |
| One story, many sources | Near-identical reports from different outlets merge into one card that credits and links every outlet |
| Context | Tap-to-explain glossary for ECOWAS, AU, AfCFTA and other acronyms (English edition); stories placed in their region by the country named |
| Desktop & paper | Keyboard: J/K, S, /, Esc · print stylesheet that keeps the article and its sources |
| Any link opens | Stories outside the latest edition are fetched on demand; saved stories open from their saved copy |
| Habit | Daily reading streak, national-day banners for all 54 nations, quiet refresh when the reader returns, morning-brief email sign-up |
| Sharing | One-tap WhatsApp and copy-link, per-story preview images, a shareable front-page image, a "Your week" stats card |
| Device | Installable PWA with a polite install prompt, offline edition pack, data saver (no photos requested), dark mode, text size |
| Trust | Privacy, terms and about links; a "Your data" control that clears reading history; cookie-less page-view analytics |
| Screens | Phone layout by default; broadsheet layout with top navigation from 960px |
| Access | Keyboard and screen-reader support, reduced-motion support, correct direction for mixed English/Arabic text |

The reader is budgeted at 60KB Brotli-compressed (a suite test enforces it);
it is currently about 40KB.

## Tech stack

| Layer | Technology |
|---|---|
| Front end | Two static single-file surfaces, hash routers, no framework |
| Build / host | Vite + Vercel (`afripulsetimes.com`) |
| Database / Auth | Supabase (Postgres, RLS; **password + magic-link** auth; Resend SMTP) |
| Serverless API | Vercel functions (`/api/*`, Node) |
| RSS ingestion | `rss-parser` in `/api/pull-wire`, Vercel Cron |
| Distribution | WhatsApp/Telegram/SMS broadcast on approve · per-story pages with full text and NewsArticle data (`/s/<slug>`) · RSS out (`/feed.xml`) · live news sitemap (`/sitemap-news.xml`) |
| Newsletter | Buttondown API (`/api/subscribe`) |
| Tests | `npm test` — 100+ node:test suites over API helpers, SPA logic, SEO and auth wiring |

## How it fits together (short version)

- Browsers talk to Supabase directly with the **public anon key**; Row Level
  Security limits anonymous users to reading *published* articles.
- The **admin** (`/desk` → `#/admin`) is gated by Supabase auth (password or
  magic link); signed-in editors with `profiles.role = editor` write articles.
- **Serverless functions** with the **service-role key** (server-only) handle
  ingestion, broadcast, newsletter and SMS; `/s/<slug>` and `/feed.xml` use the
  anon key only.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full diagram and data
flows.

## 5-minute local quick start

Prerequisites: Node 18+, a free [Supabase](https://supabase.com) project, and
the [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`).

```bash
# 1. Install
git clone <repo-url> && cd AfriPulseTimes
npm install

# 2. Apply the database schema to your Supabase project
#    Easiest: open supabase.com -> SQL Editor and run, in order, the files in
#    supabase/migrations/*.sql  (or use the Supabase CLI: `supabase db push`)

# 3. Configure environment
cp .env.example .env.local
#    Fill in the values (see docs/ENV.md). At minimum:
#    VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY  (browser)
#    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY    (functions)

# 4. Run the full stack locally (static site + /api functions)
vercel dev
#    -> http://localhost:3000
```

`vercel dev` runs the front end **and** the `/api` functions. For a front-end-only
preview without the API, use `npm run dev` (Vite, http://localhost:5173).

## Tests

```bash
npm test          # fast, dependency-free unit tests (Node's built-in runner)
npm run e2e       # drives the reader in headless Chromium (tests/e2e/)
```

The end-to-end scripts serve `public/` from a throwaway local server with a
mocked Supabase client, then click through the reader the way a person would:
first-open welcome, the cover and sections, reading flow, swipes, read-aloud,
sharing, photos, the archive, home region, nations, the install prompt and
more. Run one with `node tests/e2e/flow.mjs`. They need Chromium once:
`npx playwright-core install chromium` (or set `CHROMIUM_PATH`).

Covers the serverless functions (FX parsing, email notification, newsletter,
RSS classification) and the SPA (inline JS parses; every translation key exists
in EN/FR/AR). These run automatically in CI (`.github/workflows/ci.yml`) on every
push and pull request. There's also an optional end-to-end browser audit — see
[`tests/README.md`](tests/README.md).

> The browser Supabase client (`public/supabase-config.js`) is **generated** from
> `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` by `npm run gen:config`, which
> runs automatically on `predev` / `prebuild`. Set those vars once; don't edit the
> generated file by hand.

## Project layout

```
api/                     Vercel serverless functions
  pull-wire.js           RSS aggregator (cron + admin-triggered)
  subscribe.js           Newsletter signup (Supabase + Buttondown)
  contact.js             Investor enquiry -> leads table + email (Resend)
  translate.js           AI article translation to FR/AR/SW/PT (cron, Claude)
  polish.js              AI cleanup of choppy RSS text -> clean briefs (cron, Claude)
  create-checkout.js     Start a Stripe subscription checkout (Phase 3)
  stripe-webhook.js      Stripe webhook -> sets profiles.tier (Phase 3)
  billing-portal.js      Stripe billing portal (manage/cancel) (Phase 3)
  market-data.js         Live African FX rates for the ticker
tests/                   Unit tests (npm test) + optional browser audit
public/
  afripulse-preview.html The SPA (UI, router, store, admin, auth, newsletter)
  supabase-config.js     Browser Supabase client (GENERATED — do not edit)
scripts/
  gen-supabase-config.mjs Writes supabase-config.js from VITE_ env vars
supabase/migrations/     Postgres schema, RLS policies, seed data
docs/                    ARCHITECTURE / DEPLOYMENT / ENV / RUNBOOK
index.html               Redirects / -> /afripulse-preview.html
vercel.json              Build, dev, and cron config
vite.config.js           Vite config
```

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system diagram + data flows
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — deploy to Vercel + link Supabase
- [`docs/ENV.md`](docs/ENV.md) — every environment variable, where it goes
- [`docs/RUNBOOK.md`](docs/RUNBOOK.md) — operating the live site
- [`docs/FEATURES.md`](docs/FEATURES.md) — how to use & edit the wow features (map, Listen, Translate…)
- [`docs/QA_REPORT.md`](docs/QA_REPORT.md) — automated test-pass results + roadmap
- [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md) — go-live checklist

**For the pitch:**
- [`docs/INVESTOR_BRIEF.md`](docs/INVESTOR_BRIEF.md) — one-page brief + deck outline
- [`docs/INVESTOR_READINESS.md`](docs/INVESTOR_READINESS.md) — product status + demo script
- [`docs/DEMO_DAY_RUNBOOK.md`](docs/DEMO_DAY_RUNBOOK.md) — pre-flight, live-demo script, backup plan
