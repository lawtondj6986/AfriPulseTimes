-- AfriPulse Times — investor / partner enquiry capture
--
-- Backs the contact form in the investor ("Series Seed · 2026") section. The
-- /api/contact serverless function inserts rows here using the service_role key
-- (which bypasses RLS), exactly like /api/subscribe → subscribers. Anonymous
-- visitors therefore never touch the table directly, so — as with subscribers —
-- there is NO anon policy: anon cannot read or write leads. Authenticated
-- (admin) users get full access so enquiries can be reviewed from the dashboard.

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: leads
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null,
  organisation  text,
  interest      text not null default 'other'
                  check (interest in ('investor', 'advertiser', 'partner', 'other')),
  message       text,
  language      text not null default 'en' check (language in ('en', 'fr', 'ar')),
  status        text not null default 'new'
                  check (status in ('new', 'contacted', 'closed')),
  created_at    timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_interest_idx  on public.leads (interest);

-- ─────────────────────────────────────────────────────────────────────────────
-- Privileges + RLS (mirrors subscribers: anon gets nothing, authenticated full)
-- ─────────────────────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.leads to authenticated;

alter table public.leads enable row level security;

create policy "Authenticated full access"
  on public.leads for all
  to authenticated using (true) with check (true);
