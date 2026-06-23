# Environment variables

Two groups: **public** (`VITE_*`, baked into the browser bundle — safe to ship)
and **server-only** (secrets used only inside Vercel functions). The template is
[`../.env.example`](../.env.example); copy it to `.env.local` for local dev.

> **Never** put `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, or
> `BUTTONDOWN_API_KEY` in any `VITE_*` variable or anywhere the browser can read
> them. The `VITE_` prefix is exactly what Vite exposes to client code.

## Public (browser) — safe to ship

| Variable | Required | Used by | Description |
|---|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | `gen-supabase-config.mjs` → browser client | Supabase Project URL (`https://<ref>.supabase.co`). |
| `VITE_SUPABASE_ANON_KEY` | ✅ | same | Supabase **anon** key. Public by design; access is controlled by Row Level Security. |

These are read at **build time** (`predev`/`prebuild` → `npm run gen:config`) and
written into `public/supabase-config.js`. Change them → rebuild/redeploy.

## Server-only (Vercel functions) — secret

| Variable | Required | Used by | Description |
|---|---|---|---|
| `SUPABASE_URL` | ✅ | `pull-wire.js`, `subscribe.js` | Supabase Project URL (same value as `VITE_SUPABASE_URL`). Falls back to `VITE_SUPABASE_URL` if unset. |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | `pull-wire.js`, `subscribe.js` | Supabase **service_role** key. Bypasses RLS to insert wire articles and newsletter subscribers. **Secret.** |
| `CRON_SECRET` | Recommended | `pull-wire.js` | Shared secret protecting `/api/pull-wire`. Vercel Cron sends it as `Authorization: Bearer …`. If unset, the endpoint is **open** (logs a warning). Generate with `openssl rand -hex 32`. |
| `BUTTONDOWN_API_KEY` | ✅ for newsletter | `subscribe.js` | Buttondown API key. If unset, signups still save to Supabase and Buttondown is skipped with a warning. |
| `BUTTONDOWN_API_URL` | Optional | `subscribe.js` | Override the Buttondown endpoint. Defaults to `https://api.buttondown.email/v1/subscribers`. Used mainly for testing. |

## Where each variable lives

| Location | Variables |
|---|---|
| `.env.local` (local dev, gitignored) | all of the above |
| Vercel → Project → Settings → Environment Variables | all of the above (set `VITE_*` so the build bakes them in) |
| `.env.example` (committed template) | placeholders for all of the above |

## Quick reference: minimal viable config

```bash
# Browser
VITE_SUPABASE_URL=https://abcd1234.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...           # anon / public key

# Server
SUPABASE_URL=https://abcd1234.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...        # service_role — secret
CRON_SECRET=$(openssl rand -hex 32)
BUTTONDOWN_API_KEY=your-buttondown-key
```

After editing `.env.local`, run `npm run gen:config` (or just `npm run dev` /
`vercel dev`, which run it automatically) to regenerate the browser client.
