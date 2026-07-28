-- AfriPulse Times — Phase 2 "spread layer": broadcast approved stories out to
-- WhatsApp / Telegram in real time, and to SMS subscribers as a daily digest.
-- Safe to re-run.

-- 1) Idempotency stamp — a story is broadcast to the channels exactly once, no
--    matter how many times the approve action (or a cron) touches it.
alter table public.articles add column if not exists broadcast_at timestamptz;

create index if not exists articles_unbroadcast_idx
  on public.articles (published_at desc)
  where broadcast_at is null and status = 'published';

comment on column public.articles.broadcast_at is
  'When this story was pushed to the messaging channels (Telegram/WhatsApp). NULL = not yet broadcast.';

-- 2) SMS opt-in list. Phones are stored E.164 (e.g. +2348…). Editors can read the
--    list; opt-ins are written by the service role in /api/sms-subscribe — never
--    by anon directly — mirroring the privacy model of `subscribers` and `leads`.
create table if not exists public.sms_subscribers (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null unique,
  country     text,
  language    text not null default 'en' check (language in ('en','fr','ar','sw','pt')),
  active      boolean not null default true,
  source      text default 'web',
  created_at  timestamptz not null default now()
);

create index if not exists sms_subscribers_active_idx
  on public.sms_subscribers (active) where active;

alter table public.sms_subscribers enable row level security;

drop policy if exists "sms_subscribers editor read" on public.sms_subscribers;
create policy "sms_subscribers editor read" on public.sms_subscribers
  for select to authenticated using (public.is_editor(auth.uid()));

comment on table public.sms_subscribers is
  'Phone opt-ins for the SMS daily digest (E.164). Editor-read only; writes via service role.';
