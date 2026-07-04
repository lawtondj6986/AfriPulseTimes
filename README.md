# AfriPulse Times

A pan-African news site: a single-page front end backed by Supabase (Postgres +
Auth), Vercel serverless functions, a cron-driven RSS aggregator, and Buttondown
for the newsletter. EN / FR / AR, with a Sanity-style admin CMS behind
magic-link auth.

## Tech stack

| Layer | Technology |
|---|---|
| Front end | Static single-file SPA (`public/afripulse-preview.html`), hash router, no framework |
| Build / host | Vite + Vercel |
| Database / Auth | Supabase (Postgres, Row Level Security, magic-link email auth) |
| Serverless API | Vercel functions (`/api/*`, Node) |
| RSS ingestion | `rss-parser` in `/api/pull-wire`, Vercel Cron every 15 min |
| Newsletter | Buttondown API (`/api/subscribe`) |

## How it fits together (short version)

- The browser talks to Supabase directly with the **public anon key**; Row Level
  Security limits anonymous users to reading *published* articles.
- The **admin** (`#/admin`) is gated by Supabase magic-link auth; signed-in
  editors write articles (still through RLS).
- Two **serverless functions** use the **service-role key** (server-only):
  `/api/pull-wire` ingests RSS on a cron, `/api/subscribe` records newsletter
  signups and forwards them to Buttondown.

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
```

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
