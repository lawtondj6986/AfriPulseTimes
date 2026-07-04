-- AfriPulse Times — paid subscriptions (Phase 3, Stripe). Safe to re-run.
--
-- Links a reader to their Stripe subscription and records its state. The
-- authoritative "what can this reader access" flag is profiles.tier
-- (free/member/insider), which the Stripe webhook keeps in sync using the
-- service-role key (readers cannot change their own tier — Phase 1 withheld the
-- column grant, and only the webhook/service role writes here).

create table if not exists public.subscriptions (
  user_id                uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text,
  tier                   text not null default 'free' check (tier in ('free','member','insider')),
  status                 text not null default 'inactive',
  billing_interval       text check (billing_interval in ('month','year')),
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists subscriptions_customer_idx on public.subscriptions (stripe_customer_id);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Privileges: readers may only READ their own row; all writes happen server-side
-- with the service-role key (the Stripe webhook), which bypasses RLS.
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;

alter table public.subscriptions enable row level security;
drop policy if exists "Users read own subscription" on public.subscriptions;
create policy "Users read own subscription"
  on public.subscriptions for select to authenticated
  using (user_id = auth.uid());

comment on table public.subscriptions is
  'Stripe subscription state per reader. profiles.tier is the access flag, kept in sync by the Stripe webhook (service role). Readers cannot write here or change their tier.';
