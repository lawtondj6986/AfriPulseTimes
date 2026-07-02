# AfriPulse Times — QA Report

_Autonomous test pass, July 2, 2026. Reproduce the automated parts any time with
`npm test` (unit) and `tests/browser/audit.mjs` (end-to-end)._

## Summary

**The codebase is in excellent shape — no bugs found.** Every page renders
without runtime errors on desktop and mobile, the serverless functions behave
correctly (including their fail-safe paths), the full database schema applies
cleanly, and the shipped site carries no vulnerable production dependencies.

## What was tested

| Area | Method | Result |
|---|---|---|
| All 14 routes (home, 9 verticals, region, article, journalists, newsletter, search, 404, admin dashboard / leads / editor) | Headless browser, per-route error capture | **14/14 render with zero runtime errors** |
| Full site audit (functional, i18n, a11y, mobile) | Headless browser | **35/35 checks pass** |
| Language switch EN → FR (localization ribbon) → AR (right-to-left) | Headless browser | Pass |
| Live FX ticker + "LIVE" marker + graceful fallback | Headless browser | Pass |
| Search, newsletter modal, investor form, admin CRUD UI, image-upload control, leads tab (badge + cards) | Headless browser | Pass |
| Mobile 390px — home / article / admin horizontal overflow | Headless browser | None |
| Accessibility basics (img `alt`, `lang` attr, headings) | Headless browser | Pass |
| `/api/market-data` (live success + upstream failure) | Node unit test | Pass |
| `/api/contact` email notification (payload, HTML-escaping, error) | Node unit test | Pass |
| `/api/subscribe` newsletter (created / duplicate / error) | Node unit test | Pass |
| `/api/pull-wire` vertical classification | Node unit test | Pass |
| SPA inline JS parses + all `t()` keys exist in EN/FR/AR | Node unit test | Pass |
| All 6 database migrations → 7 tables, 14 RLS policies | Real Postgres, full chain | Clean, idempotent |
| Production dependency vulnerabilities | `npm audit --omit=dev` | **0** (2 flagged are dev-only build tools) |

## Known limitations (by design / environment)

- **External live calls** (the real currency API, the live Supabase/Vercel
  project) were not reachable from the test environment, so logic and fallbacks
  were verified rather than the live endpoints. They run on Vercel's network.
- **Content** is largely seed/demo data until "Pull live wire" is run.
- **FX rates update daily** (free data tier) — real and current, not intraday.
- **Routing is hash-based**, so stories aren't individually shareable and lack
  per-article SEO/social previews (see roadmap item 1).

## Configuration note — admin login

The "check Supabase config" message some users see on the admin login is a
**deployment configuration issue, not a code defect**: the browser needs
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set in Vercel **and a redeploy**
(these bake in at build time), plus the auth redirect URL configured in Supabase.
The config-generation pipeline was verified to bake real values correctly when
those variables are present.

## Prioritized improvements

**Near-term**
1. Server-side rendering / real per-article URLs → shareable links + per-story SEO/OG.
2. ~~Automated test suite in the repo~~ ✅ **done** (this suite + CI).
3. Seed real editorial content and real RSS sources.

**Mid-term**
4. Split the single 3,000-line HTML file into modules for maintainability.
5. Full accessibility pass (keyboard nav, modal focus trapping, contrast/WCAG).
6. Reader accounts, saved articles, comments; auto-generated newsletter digests.
7. Advertiser analytics dashboards (per-vertical / per-region engagement).

**Long-term**
8. "AfriPulse Broadcast" short video/audio; native mobile apps with offline
   reading; advertiser self-serve portal; paid membership tier.
