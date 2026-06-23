# Launch Checklist — AfriPulse Times

Everything required to take v1 live, by dashboard. Tick top-to-bottom.
Details: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) · [`docs/ENV.md`](docs/ENV.md) · [`docs/RUNBOOK.md`](docs/RUNBOOK.md)

## 1. Supabase dashboard
- [ ] **Create project** (region near readers); save the DB password.
- [ ] **SQL Editor → run migrations in order:**
  - [ ] `supabase/migrations/20260623120000_initial_schema.sql`
  - [ ] `supabase/migrations/20260623130000_articles_payload.sql`
  - [ ] `supabase/migrations/20260623140000_articles_auth_write_policies.sql`
- [ ] **Settings → API → copy:** Project URL, `anon` key, `service_role` key.
- [ ] **Authentication → Providers → Email:** enabled (magic links on).
- [ ] **Authentication → URL Configuration → Site URL:** your production domain.
- [ ] **Authentication → URL Configuration → Redirect URLs** (add each):
  - [ ] `https://<your-domain>`
  - [ ] `https://<project>.vercel.app` (+ `https://*.vercel.app` for previews)
  - [ ] `http://localhost:3000` (local `vercel dev`)
- [ ] *(Optional, recommended)* restrict who can sign into `#/admin` — see RUNBOOK "Locking down the admin".

## 2. Buttondown dashboard
- [ ] **Create account** (free tier OK).
- [ ] **Settings → Programming → API → copy** the API key.
- [ ] *(Optional)* set your welcome / double opt-in email.
- [ ] Note: the function sends `email_address`. If signups 400 on the field name, switch to `email` in `api/subscribe.js` (see RUNBOOK).

## 3. Vercel dashboard
- [ ] **Import** the GitHub repo (`lawtondj6986/AfriPulseTimes`); framework auto-detects **Vite** (build/dev/cron come from `vercel.json`).
- [ ] **Settings → Environment Variables** (set for **Production** + Preview):
  - [ ] `VITE_SUPABASE_URL` = Supabase Project URL *(public)*
  - [ ] `VITE_SUPABASE_ANON_KEY` = Supabase anon key *(public)*
  - [ ] `SUPABASE_URL` = Supabase Project URL *(server)*
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` = Supabase service_role key *(**secret**)*
  - [ ] `CRON_SECRET` = `openssl rand -hex 32` *(**secret**)*
  - [ ] `BUTTONDOWN_API_KEY` = Buttondown key *(**secret**)*
- [ ] **Deploy** (build runs `gen:config`, baking the `VITE_` values into the browser client).
- [ ] **Settings → Domains:** add your custom domain; set it as Production. (Add the domain to Supabase Redirect URLs above.)
- [ ] **Cron Jobs:** confirm `/api/pull-wire` at `*/15 * * * *` is listed & enabled.
  - [ ] ⚠️ Hobby plan runs cron ~once/day — **Pro** required for true 15-min cadence.
- [ ] After changing any `VITE_` var later → **redeploy** (baked at build time).

## 4. Post-deploy smoke test
- [ ] Open the production URL → site loads, published articles show.
- [ ] `#/admin` → request magic link → email arrives → sign in → editor appears.
- [ ] Create + publish an article → shows on home; **Sign out** works.
- [ ] `curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/pull-wire`
      → Vercel **Functions → Logs** show `[pull-wire] done · inserted N …`.
- [ ] `curl -X POST https://<domain>/api/subscribe -H 'content-type: application/json' -d '{"email":"you@example.com","language":"en"}'`
      → row appears in Supabase `subscribers` **and** in Buttondown.

## 5. Security final check
- [ ] `service_role` key, `CRON_SECRET`, `BUTTONDOWN_API_KEY` are set **only** as server env vars — never in a `VITE_` var.
- [ ] Deployed `/supabase-config.js` shows your **real** project URL (not `YOUR_PROJECT_REF`).
- [ ] `CRON_SECRET` is set (otherwise `/api/pull-wire` is publicly callable).
- [ ] RLS is on for all tables (enforced by the migrations) — anonymous users can only read **published** articles.
