-- AfriPulse Times — first-party page-view counter
--
-- Backs the "Pageviews" + "Most read" metrics on the admin Traction dashboard.
-- One row per article open (the browser inserts it, deduped per session). Kept
-- deliberately simple/first-party so the number is genuinely ours, not a
-- third-party estimate.
--
-- Privacy: anonymous visitors may only INSERT a view event; they cannot read the
-- log. Only authenticated (admin) users can read it, for the dashboard.

create table if not exists public.article_views (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists article_views_created_idx on public.article_views (created_at desc);
create index if not exists article_views_slug_idx    on public.article_views (slug);

-- anon: insert only (record a view). authenticated: insert + read (dashboard).
grant insert on public.article_views to anon;
grant select, insert on public.article_views to authenticated;

alter table public.article_views enable row level security;

drop policy if exists "Anyone can record a view" on public.article_views;
create policy "Anyone can record a view"
  on public.article_views for insert
  to anon, authenticated with check (true);

drop policy if exists "Authenticated can read views" on public.article_views;
create policy "Authenticated can read views"
  on public.article_views for select
  to authenticated using (true);
