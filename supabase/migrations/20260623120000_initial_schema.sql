-- AfriPulse Times — initial schema
-- Tables: verticals, regions, authors, articles, rss_sources, subscribers
-- Row Level Security enabled on every table.
-- Public (anon) may SELECT published articles, plus all authors, verticals,
-- and regions. Everything else (drafts, all writes, rss_sources, subscribers)
-- requires an authenticated user.

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: keep updated_at fresh on row updates
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Taxonomy: verticals
-- ─────────────────────────────────────────────────────────────────────────────
create table public.verticals (
  slug      text primary key,
  label_en  text not null,
  label_fr  text not null,
  label_ar  text not null
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Taxonomy: regions
-- ─────────────────────────────────────────────────────────────────────────────
create table public.regions (
  slug      text primary key,
  label_en  text not null,
  label_fr  text not null,
  label_ar  text not null
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Authors (journalist roster)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.authors (
  slug          text primary key,
  name          text not null,
  beat          text,
  bio           text,
  avatar_color  text,
  location      text
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Articles
-- ─────────────────────────────────────────────────────────────────────────────
create table public.articles (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  headline      text not null,
  dek           text,
  body          text,
  vertical      text references public.verticals(slug) on update cascade on delete set null,
  region        text references public.regions(slug)   on update cascade on delete set null,
  author_slug   text references public.authors(slug)   on update cascade on delete set null,
  hero_image    text,
  video_url     text,
  status        text not null default 'draft'
                  check (status in ('draft', 'published', 'archived')),
  source        text,
  source_url    text,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index articles_status_published_at_idx
  on public.articles (status, published_at desc);
create index articles_vertical_idx on public.articles (vertical);
create index articles_region_idx   on public.articles (region);
create index articles_author_idx   on public.articles (author_slug);

create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- RSS sources (wire feeds)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.rss_sources (
  id               uuid primary key default gen_random_uuid(),
  url              text not null unique,
  label            text not null,
  hint_vertical    text references public.verticals(slug) on update cascade on delete set null,
  active           boolean not null default true,
  last_fetched_at  timestamptz
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Newsletter subscribers
-- ─────────────────────────────────────────────────────────────────────────────
create table public.subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  language    text not null default 'en' check (language in ('en', 'fr', 'ar')),
  created_at  timestamptz not null default now(),
  confirmed   boolean not null default false
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Privileges
-- Supabase normally grants these to the anon/authenticated roles automatically;
-- we state them explicitly so the migration is portable and so RLS (below) is
-- the single source of truth for *which rows* each role can touch. anon only
-- ever reads, so it gets SELECT; authenticated gets full DML. RLS still gates
-- every row, so a SELECT grant on (e.g.) subscribers is inert without a policy.
-- ─────────────────────────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.verticals    enable row level security;
alter table public.regions      enable row level security;
alter table public.authors      enable row level security;
alter table public.articles     enable row level security;
alter table public.rss_sources  enable row level security;
alter table public.subscribers  enable row level security;

-- Public (anon + authenticated) read access ----------------------------------
create policy "Public read published articles"
  on public.articles for select
  using (status = 'published');

create policy "Public read authors"
  on public.authors for select
  using (true);

create policy "Public read verticals"
  on public.verticals for select
  using (true);

create policy "Public read regions"
  on public.regions for select
  using (true);

-- Authenticated full access on every table -----------------------------------
-- (covers reading drafts, all writes, and the rss_sources / subscribers tables,
--  which have no public policy and are therefore authenticated-only.)
create policy "Authenticated full access"
  on public.articles for all
  to authenticated using (true) with check (true);

create policy "Authenticated full access"
  on public.authors for all
  to authenticated using (true) with check (true);

create policy "Authenticated full access"
  on public.verticals for all
  to authenticated using (true) with check (true);

create policy "Authenticated full access"
  on public.regions for all
  to authenticated using (true) with check (true);

create policy "Authenticated full access"
  on public.rss_sources for all
  to authenticated using (true) with check (true);

create policy "Authenticated full access"
  on public.subscribers for all
  to authenticated using (true) with check (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed data (from constants in afripulse-preview.html)
-- ─────────────────────────────────────────────────────────────────────────────

-- Verticals (VERTICAL_KEYS + i18n vert labels)
insert into public.verticals (slug, label_en, label_fr, label_ar) values
  ('front',    'Front Page',         'À la une',            'الصفحة الأولى'),
  ('politics', 'Politics',           'Politique',           'السياسة'),
  ('mining',   'Mining & Energy',    'Mines & Énergie',     'التعدين والطاقة'),
  ('markets',  'Business & Markets', 'Économie & Marchés',  'الأعمال والأسواق'),
  ('tech',     'Tech & Innovation',  'Tech & Innovation',   'التكنولوجيا والابتكار'),
  ('culture',  'Culture',            'Culture',             'الثقافة'),
  ('sports',   'Sports',             'Sport',               'الرياضة'),
  ('opinions', 'Opinions',           'Opinions',            'آراء'),
  ('podcasts', 'Podcasts',           'Podcasts',            'بودكاست');

-- Regions (REGION_KEYS + i18n region labels)
insert into public.regions (slug, label_en, label_fr, label_ar) values
  ('west-africa',     'West Africa',     'Afrique de l''Ouest', 'غرب أفريقيا'),
  ('east-africa',     'East Africa',     'Afrique de l''Est',   'شرق أفريقيا'),
  ('southern-africa', 'Southern Africa', 'Afrique australe',    'جنوب أفريقيا'),
  ('north-africa',    'North Africa',    'Afrique du Nord',     'شمال أفريقيا'),
  ('central-africa',  'Central Africa',  'Afrique centrale',    'وسط أفريقيا');

-- RSS sources (FEEDS array)
insert into public.rss_sources (url, label, hint_vertical, active) values
  ('https://feeds.bbci.co.uk/news/world/africa/rss.xml',            'BBC Africa',            'front',    true),
  ('https://www.aljazeera.com/xml/rss/all.xml',                     'Al Jazeera',            'front',    true),
  ('https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf','AllAfrica',             'front',    true),
  ('https://www.premiumtimesng.com/feed',                           'Premium Times',         'politics', true),
  ('https://www.dailymaverick.co.za/feed/',                         'Daily Maverick',        'politics', true),
  ('https://techcabal.com/feed/',                                   'TechCabal',             'tech',     true),
  ('https://african.business/feed',                                 'African Business',      'markets',  true),
  ('https://guardian.ng/feed/',                                     'The Guardian Nigeria',  'front',    true),
  ('https://www.theeastafrican.co.ke/tea/rss',                      'The East African',      'politics', true),
  ('https://mg.co.za/feed/',                                        'Mail & Guardian',       'politics', true),
  ('https://www.engineeringnews.co.za/rss/mining',                  'Mining Weekly',         'mining',   true),
  ('https://disrupt-africa.com/feed/',                              'Disrupt Africa',        'tech',     true);
