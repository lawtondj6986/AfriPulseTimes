# Runbook

Operating AfriPulse Times in production: routine tasks, monitoring, and the most
likely failures with their fixes.

## Where to look

| Signal | Where |
|---|---|
| RSS / newsletter function logs | Vercel → Project → **Functions → Logs** (filter `pull-wire` / `subscribe`) |
| Cron status & history | Vercel → Project → **Cron Jobs** |
| Articles, subscribers, feeds | Supabase → **Table Editor** (`articles`, `subscribers`, `rss_sources`) |
| Auth sign-ins | Supabase → **Authentication → Users** / **Logs** |
| Newsletter list | Buttondown dashboard |

Log lines to grep for:
- `[pull-wire] start · N active source(s)` / `[pull-wire] done · inserted N …`
- `[pull-wire] OK <feed> …` / `[pull-wire] FAIL <feed> · <error>`
- `[subscribe] <email> · supabase=<…> · buttondown=<…>`

## Routine tasks

### Add / remove / disable an RSS feed
Feeds live in the `rss_sources` table (not in code).
```sql
-- add
insert into rss_sources (url, label, hint_vertical, active)
values ('https://example.com/feed', 'Example', 'politics', true);

-- disable without deleting
update rss_sources set active = false where label = 'Example';
```
The next cron run (or admin "Pull live wire") picks up the change. `hint_vertical`
biases classification; valid verticals: `front, politics, mining, markets, tech,
culture, sports, opinions, podcasts`.

### Manually trigger an RSS pull
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/pull-wire
```
Or sign in to `#/admin` and click **Pull live wire**.

### Add an editor
Anyone who can complete a magic-link sign-in becomes an `authenticated` user and
can write articles. To restrict this, see "Locking down the admin" below.

### Rotate a key
- **Service role / anon:** Supabase → Settings → API → roll the key, then update
  the matching Vercel env var(s) and **redeploy** (the anon key is baked into the
  browser bundle at build time).
- **CRON_SECRET / Buttondown:** update the Vercel env var; redeploy. No code change.

## Common failures

### Site loads but shows no articles / console error about Supabase
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` not set at build time, so
  `public/supabase-config.js` still has `YOUR_PROJECT_REF` placeholders.
- **Fix:** set the `VITE_*` vars in Vercel and **redeploy** (or run
  `npm run gen:config` locally). Verify the deployed `supabase-config.js` contains
  your real project URL.

### Magic-link sign-in fails / link does nothing
- Redirect URL not allowlisted.
- **Fix:** Supabase → Auth → URL Configuration → add the exact origin
  (`https://<domain>`, `http://localhost:3000`).

### Editor can't save (writes rejected)
- Not actually authenticated (session expired) — RLS blocks anonymous writes.
- **Fix:** sign in again. Confirm the `articles` RLS policies exist (the three
  `Authenticated insert/update/delete articles` policies from migration
  `…140000`).

### Cron isn't ingesting
1. Vercel → Cron Jobs: is `/api/pull-wire` listed and enabled?
2. **Hobby plan only runs cron ~once/day** — 15-minute cadence needs **Pro**.
3. Logs show `401 Unauthorized` → `CRON_SECRET` mismatch between Vercel cron and
   the env var. Re-set it and redeploy.
4. Logs show `Server not configured` → missing `SUPABASE_URL` /
   `SUPABASE_SERVICE_ROLE_KEY`.

### Specific feeds always FAIL in logs
- Source is down, blocks server user-agents, or changed its URL. This is
  expected for individual feeds and is non-fatal — other feeds still ingest.
- **Fix:** update or disable the row in `rss_sources`.

### Newsletter signup returns success but nothing in Buttondown
- Logs show `buttondown=skipped` → `BUTTONDOWN_API_KEY` not set.
- Logs show `buttondown=failed` with a 400 about an unexpected field → your
  account expects `email` instead of `email_address`. Adjust the body in
  `api/subscribe.js` (`saveToButtondown`). The subscriber is still safely in the
  Supabase `subscribers` table either way.

### Duplicate articles after a pull
- Shouldn't happen: dedupe is by `source_url`, and slugs are deterministic
  (`wire-<title>-<hash(url)>`) with `onConflict: slug, ignoreDuplicates`. If you
  see dupes, check whether a feed changes item URLs between fetches.

## Locking down the admin (optional hardening)

Today any successful magic-link sign-in can edit articles. To restrict to named
editors, gate the write policies on an allowlist — e.g. add an `editors` table and
change the `articles` `INSERT/UPDATE/DELETE` policies from `to authenticated
using (true)` to check `auth.uid()` membership, or use Supabase's email-domain
allowlist under Auth settings.

## Data & recovery notes

- **Source of truth** is Supabase. The browser keeps a localStorage cache for
  instant paint; clearing it is harmless (it re-reads from the DB).
- **Wire articles** (`source='rss'`) are reproducible — they re-ingest from feeds.
  Authored articles (`source='authored'`) are not; rely on Supabase's backups.
- Migrations are immutable history; make schema changes as **new** files in
  `supabase/migrations/` rather than editing applied ones.
