# Phase 2 — the spread layer (WhatsApp · Telegram · SMS)

How AfriPulse pushes approved stories out to where people already are. Built to be
**inert until you add credentials**, so it's safe in production today and turns on
per-channel as you set each one up. Pilot country: **Nigeria**.

## How it works
- **Real-time (per story):** when an editor hits **✓ Approve** in the Command
  Center, the browser calls `/api/broadcast`, which posts the headline + link to
  **Telegram** and **WhatsApp**. Idempotent — each story broadcasts **once**
  (guarded by `articles.broadcast_at`), so re-approving or retries never double-post.
- **Daily digest (SMS):** a Vercel cron (`0 7 * * *`) calls `/api/sms-digest`,
  which texts the day's top 4 headlines to everyone who opted in. SMS is metered,
  so it's a once-a-day digest — not per story.
- **Opt-in:** the site's Subscribe box now has an optional phone field →
  `/api/sms-subscribe` stores the number (E.164, Nigeria-normalised) in
  `sms_subscribers`.

## Required one-time setup

### 1. Run the migration
Run `supabase/migrations/20260728140000_broadcast_channels.sql` in **Supabase →
SQL Editor** (adds `articles.broadcast_at` and the `sms_subscribers` table).
Verified against real Postgres 16; safe to re-run.

### 2. Add channel credentials in **Vercel → Project → Settings → Environment Variables**
Set only the channels you want live; unset channels are skipped cleanly.

| Channel | Env vars | Where to get them |
|---|---|---|
| **Telegram** (easiest, free) | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Message **@BotFather** → `/newbot` → copy the token. Create a public channel, add the bot as admin, set `TELEGRAM_CHAT_ID` to `@yourchannel`. |
| **WhatsApp** (Meta Cloud API) | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_TO` | Meta **developers.facebook.com** → WhatsApp → API Setup: access token + phone-number ID. `WHATSAPP_TO` = comma-separated E.164 recipients/broadcast numbers. |
| **SMS** (Africa's Talking — strong in Nigeria) | `AT_API_KEY`, `AT_USERNAME`, `AT_SENDER` (optional sender id/shortcode) | **africastalking.com** → create an app → API key + username. Buy a Nigeria sender id/shortcode for branded SMS. |
| Shared | `SITE_URL`, `CRON_SECRET` | `SITE_URL=https://afri-pulse-times.vercel.app`. `CRON_SECRET` protects the endpoints (Bearer for cron; editor JWT for the browser). |

> **WhatsApp note:** the Cloud API sends to opted-in numbers/templates; scaling to a
> large audience needs a message template + an opt-in list. For the pilot, use a
> small `WHATSAPP_TO` list (or a linked WhatsApp group number). **Telegram is the
> instant, free, unlimited channel** — set that up first to demo real-time reach.

## Test each channel
- **Telegram/WhatsApp:** set the vars, redeploy, approve any story in the Command
  Center → it appears in the channel within a second. (Check the browser Network
  tab: `POST /api/broadcast` → `configured:true` and per-channel results.)
- **SMS opt-in:** open Subscribe on the site, add a phone (e.g. `0803 123 4567`) →
  it lands in `sms_subscribers`.
- **SMS digest:** trigger `/api/sms-digest` (the daily cron, or an editor POST with
  a Bearer token) → returns a `preview` of the text and, once AT is configured and
  you have subscribers, sends it.

## Files
- `api/broadcast.js` — real-time Telegram/WhatsApp fan-out (idempotent, editor-auth).
- `api/sms-digest.js` — daily SMS digest via Africa's Talking (+ phone helpers).
- `api/sms-subscribe.js` — phone opt-in (normalises to +234 by default).
- `supabase/migrations/20260728140000_broadcast_channels.sql` — schema.
- Command Center approve wiring + Subscribe phone field in `afripulse-preview.html`.
- Tests: `tests/broadcast.test.mjs` (16 — compose, channel gating, phone
  normalisation, digest).

Set `SMS_DEFAULT_CC` to change the default country code from Nigeria (`234`).
