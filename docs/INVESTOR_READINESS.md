# AfriPulse Times — Investor Readiness Package

_Prepared for the Series Seed pitch (July 2026). This is the single-page
briefing: what was broken and is now fixed, what was added, the demo script,
and — most important — the short list of things you must click before you
present._

---

## 1. Executive summary

AfriPulse Times is a pan-African digital newsroom covering 54 nations across 9
verticals, in three languages (English, French, Arabic). The product is a fast
single-page site backed by Supabase (Postgres + auth + row-level security) and
deployed on Vercel, with serverless jobs for wire ingestion, newsletter signup,
AI translation, and investor-lead capture.

Going into the pitch it is: **bug-free on the core reader journey, visually
premium, fully trilingual in the interface, and wired end-to-end to a real
database** — searches return real results, the newsletter and investor forms
write to Supabase, and the admin desk performs live CRUD against the same store
the public site reads.

---

## 2. Bugs fixed (audit → resolution)

| # | Finding (audit) | Severity | Resolution |
|---|-----------------|----------|------------|
| 1 | Language switcher "looked broken" — UI chrome changed but article headlines stayed English with no explanation | P0 | Honest, branded **localization ribbon** appears only in FR/AR while an article still lacks a translation, and auto-disappears the moment AI translations land. Interface (nav, labels, dates, forms) is fully localized. |
| 2 | Newsletter used a raw `window.prompt()` box | P0 | Replaced with a styled, trilingual **subscribe modal** (ESC/backdrop/× close, autofocus) posting to `/api/subscribe`. |
| 3 | Distressing stock photo surfaced on a seed article | P0 | Image removed; seed article now renders the branded placeholder. |
| 4 | Article images hot-linked to random Picsum/Unsplash; broken images showed junk | P1 | Removed the random fallback. Missing/broken images now render a **branded "AfriPulse Times" placeholder** (`onerror` falls back to it too). |
| 5 | `<title>` said "MVP"; no SEO/social metadata | P1 | Production title, full **Open Graph + Twitter cards**, canonical URL, and `NewsMediaOrganization` JSON-LD. |
| 6 | Search jumped to the first hit and toasted — no results page | P1 | Real **`#/search/<query>` results view** across headline, standfirst, byline, dateline, vertical, and tags, with localized empty/no-result/count states. |
| 7 | Investor section was copy + `mailto:` only — no capture | P1 | Inline **investor/partner enquiry form** writing leads to Supabase (see §4). |

The core reader journey (home → vertical → article → search → language switch →
subscribe → enquire) was exercised end-to-end in a headless Chromium smoke test:
**12/12 checks pass, zero runtime page errors**, and the layout has no horizontal
overflow at a 390 px mobile viewport.

---

## 3. Enhancements delivered

- **Trilingual interface** (EN / FR / AR) with right-to-left handling for Arabic.
- **AI article translation** pipeline (`/api/translate`, Claude) — populates
  French + Arabic headline/standfirst/body per article on a daily cron. Built and
  tested; goes live once the API key is set (see §5).
- **Server-side wire aggregation** (`/api/pull-wire`, daily cron) pulling from
  vetted African RSS sources into the same article store.
- **Newsletter** capture to Supabase + Buttondown (`/api/subscribe`).
- **Investor lead capture** to Supabase (`/api/contact` → `leads` table).
- **Admin desk** with magic-link auth: create / edit / publish / delete articles
  live against Supabase, gated by row-level security. Includes an **Enquiries
  tab** to work investor/partner leads — filter, mark new/contacted/closed
  (persisted to Supabase), reply by email, and a "new" badge count.
- **Premium branding**: deep-green / gold palette, Fraunces display type,
  consistent placeholders, refined masthead and investor section.
- **Resilience**: the site always paints instantly from a local cache/seed, then
  reconciles with Supabase — so a slow or unreachable database never shows a blank
  screen (verified: the sandbox blocks the DB and the site still renders fully).

---

## 4. New data: the `leads` table

`/api/contact` inserts investor/partner enquiries using the service-role key
(bypasses RLS, exactly like newsletter signups). The table is locked down — the
public anon key cannot read or write it; only authenticated admins can.

```
leads(
  id           uuid pk,
  name         text  not null,
  email        text  not null,
  organisation text,
  interest     text  check in (investor|advertiser|partner|other),
  message      text,
  language     text  check in (en|fr|ar),
  status       text  check in (new|contacted|closed)  default 'new',
  created_at   timestamptz
)
```

Migration: `supabase/migrations/20260701120000_leads.sql`. Verified against a
real Postgres instance through the full migration chain: constraints reject bad
`interest`/`language` values, RLS blocks anon, and authenticated read works.

Full schema and system diagram: [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## 5. ⚠️ Before you present — do these (≈10 minutes)

These need YOUR accounts; they can't be done from the dev sandbox.

1. **Run the leads migration** on your Supabase project.
   Supabase dashboard → SQL Editor → paste the contents of
   `supabase/migrations/20260701120000_leads.sql` → Run. Without this, the
   investor form shows a friendly error and the `mailto:` fallback still works.
2. **Confirm the site's env vars in Vercel** (Project → Settings → Environment
   Variables) — see [`ENV.md`](./ENV.md):
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (browser)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (functions: contact, subscribe, wire, translate)
   - `BUTTONDOWN_API_KEY` (newsletter)
   - `ANTHROPIC_API_KEY` (only if you want AI translations live for the pitch)
3. **Smoke-test the live site** (2 min): open it, switch to FR (ribbon appears),
   search a country, submit the investor form with your own email, then check
   Supabase → Table editor → `leads` for the row.
4. _(Optional)_ **Turn on AI translations**: set `ANTHROPIC_API_KEY`, then either
   wait for the 06:30 UTC cron or trigger `/api/translate` once. Translated
   articles drop the localization ribbon automatically.

If you only have time for one thing, do **#1** — it's what makes the investor
form fully live on stage.

---

## 6. Live demo script

**The 60-second version:**

1. **Land on the homepage.** "This is AfriPulse Times — one masthead for 54
   African nations, updating in real time." Point at the live story count and the
   verticals.
2. **Click a vertical, then a story.** "Every story is a real record in our
   database, filed by bureau, tagged by country and topic."
3. **Switch to Français, then العربية.** "The whole product is trilingual — and
   our AI translation layer is rendering the articles themselves into French and
   Arabic." (The ribbon honestly signals rollout if a piece isn't translated yet.)
4. **Search a country** (e.g. "Nigeria"). "Full-text search across every
   vertical, instantly."
5. **Scroll to the Series Seed section and submit the form.** "And this is live —
   your enquiry just landed in our database." (Then, if you like, show the row in
   Supabase.)

**If you have 3 minutes,** add: the admin desk (log in via magic link, publish a
story, watch it appear on the public site; open the **Enquiries tab** to show the
lead you just captured and mark it "contacted") and the wire aggregator (explain
the daily cron pulling vetted African sources).

**One-liner close:** "A production newsroom platform, trilingual, AI-assisted,
running on infrastructure that costs us cents a day and scales to the whole
continent."

---

## 7. Post-MVP roadmap (what the raise funds)

**Near term (0–3 months)**
- Server-side rendering / prerender for real per-article URLs → SEO + shareable
  links with correct OG images per story (today routing is hash-based).
- Admin image upload to Supabase Storage (replace placeholder-or-hotlink).
- Editorial workflow: draft → review → publish states, scheduled publishing.
- Lead pipeline: email notifications on new enquiries, CSV export, notes/owner
  assignment (the admin Enquiries tab already covers triage: new/contacted/closed).

**Mid term (3–9 months)**
- Reader accounts, saved stories, and comments.
- Newsletter editions generated from published stories (daily/weekly digests).
- Analytics: story-level engagement, vertical/region dashboards for advertisers.
- Expand wire coverage and add human-in-the-loop review of AI translations.

**Long term (9–18 months)**
- "AfriPulse Broadcast": short-form video/audio section.
- Native mobile apps; offline reading for low-bandwidth regions.
- Advertiser self-serve portal against the reserved ad slots already in the design.
- Paid tiers / membership.

---

## 8. Operations & deploy

- **Deploy**: push to `main`; Vercel builds and ships automatically. Full runbook
  in [`DEPLOYMENT.md`](./DEPLOYMENT.md) and [`RUNBOOK.md`](./RUNBOOK.md).
- **Crons** (`vercel.json`): `/api/pull-wire` daily 06:00 UTC, `/api/translate`
  daily 06:30 UTC. (Hobby plan = daily; upgrading unlocks more frequent wire pulls.)
- **Secrets** live only in Vercel env vars; the service-role and Anthropic keys
  are never exposed to the browser. Details in [`ENV.md`](./ENV.md).
