# Deployment

Deploy target: **Vercel** (static site + `/api` functions + cron), backed by a
**Supabase** project, with **Buttondown** for the newsletter. This guide takes
you from an empty Supabase project to a live URL.

> See [`ENV.md`](ENV.md) for the meaning of every variable and
> [`../LAUNCH_CHECKLIST.md`](../LAUNCH_CHECKLIST.md) for a tick-box version.

## 1. Create the Supabase project

1. At [supabase.com](https://supabase.com) → **New project**. Choose a region
   close to your readers; save the database password.
2. Wait for provisioning (~2 min).
3. **Apply the schema.** In **SQL Editor**, run the migrations **in order**:
   - `supabase/migrations/20260623120000_initial_schema.sql`
   - `supabase/migrations/20260623130000_articles_payload.sql`
   - `supabase/migrations/20260623140000_articles_auth_write_policies.sql`

   (Or with the Supabase CLI: `supabase link --project-ref <ref>` then
   `supabase db push`.)
4. **Grab the keys** under **Project Settings → API**:
   - **Project URL** → used for both `VITE_SUPABASE_URL` and `SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (**secret** — server only)

## 2. Configure Supabase Auth (magic links)

1. **Authentication → Providers → Email**: ensure Email is enabled (magic links
   on by default).
2. **Authentication → URL Configuration → Redirect URLs**: add every origin you
   sign in from, e.g.:
   - `http://localhost:3000` (local `vercel dev`)
   - `https://<your-vercel-domain>` (production)
   - `https://*.vercel.app` (preview deploys, optional)

   The magic link redirects to `origin + pathname`; if the origin isn't listed,
   Supabase rejects the sign-in.

## 3. Create the Buttondown account

1. Sign up at [buttondown.email](https://buttondown.email) (free tier is fine).
2. **Settings → Programming → API**: copy the API key → `BUTTONDOWN_API_KEY`.

## 4. Deploy to Vercel

1. Push the repo to GitHub.
2. In Vercel → **Add New → Project** → import the repo. The framework preset is
   **Vite**; `vercel.json` already sets the build/dev commands and the cron, so
   accept the defaults.
3. **Add Environment Variables** (Project → Settings → Environment Variables).
   Set these for **Production** (and Preview/Development as needed):

   | Variable | Value | Scope |
   |---|---|---|
   | `VITE_SUPABASE_URL` | Supabase Project URL | Public (baked into the browser bundle) |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Public |
   | `SUPABASE_URL` | Supabase Project URL | Server |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key | **Secret** |
   | `CRON_SECRET` | `openssl rand -hex 32` | **Secret** |
   | `BUTTONDOWN_API_KEY` | Buttondown API key | **Secret** |

   The `VITE_*` values are read at **build time** by `gen-supabase-config.mjs` and
   baked into `public/supabase-config.js`. If you change them, **redeploy** so the
   browser picks them up.
4. **Deploy.** Vercel runs `npm run build` (which runs `prebuild` →
   `gen:config`), publishes `dist/`, and registers the cron from `vercel.json`.

## 5. Post-deploy verification

- Visit the production URL → the site loads and shows published articles.
- `#/admin` → request a magic link → confirm you can sign in and the editor
  appears.
- **Cron:** Vercel → Project → **Cron Jobs** shows `/api/pull-wire` at
  `*/15 * * * *`. Trigger it once manually (or `curl -H "Authorization: Bearer
  $CRON_SECRET" https://<domain>/api/pull-wire`) and check **Functions → Logs**
  for `[pull-wire] done · inserted N …`.
- **Newsletter:** submit the form (or
  `curl -X POST https://<domain>/api/subscribe -H 'content-type: application/json'
  -d '{"email":"you@example.com","language":"en"}'`) → row appears in the Supabase
  `subscribers` table and in your Buttondown list.

## Which env var goes in which dashboard

| Dashboard | Variables |
|---|---|
| **Vercel** (Project → Settings → Env Vars) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `BUTTONDOWN_API_KEY` |
| **Supabase** (Auth → URL Configuration) | Redirect URLs (your Vercel domain + localhost) |
| **Buttondown** | Nothing to set; just generate the API key used above |

## Caveats

- **Cron frequency on Vercel Hobby:** scheduled functions effectively run **once
  per day** on the Hobby plan. The `*/15` schedule is correct, but 15-minute
  granularity requires the **Pro** plan.
- **Without `CRON_SECRET`,** `/api/pull-wire` runs **unprotected** (and logs a
  warning). Always set it in production.
- **Buttondown field name:** the function sends `email_address`. If your account
  expects the older `email` field and returns a 400, see `RUNBOOK.md`.
