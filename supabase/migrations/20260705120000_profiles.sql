-- AfriPulse Times — reader profiles (Phase 1: accounts & profiles).
--
-- Every signed-in user gets a public profile: display name, handle, bio, country,
-- language, interests, occupation, avatar, plus a ROLE (reader/editor/admin) and a
-- subscription TIER (free/member/insider). The role is what separates ordinary
-- readers from newsroom editors — see 20260705140000_reader_auth_security.sql,
-- which gates the CMS and all sensitive tables on role='editor'.
--
-- Security note: readers must NEVER be able to promote themselves. RLS lets a user
-- edit their OWN row, but we additionally withhold column privileges on `role` and
-- `tier` from the `authenticated` role, so those two columns can only ever be
-- changed by the service role (SQL editor / server). Belt and braces.

-- ─────────────────────────────────────────────────────────────────────────────
-- Table
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  handle       text unique,
  display_name text,
  bio          text,
  country      text,
  language     text not null default 'en' check (language in ('en','fr','ar','sw','pt')),
  interests    text[] not null default '{}',
  occupation   text,
  avatar_url   text,
  role         text not null default 'reader' check (role in ('reader','editor','admin')),
  tier         text not null default 'free'   check (tier in ('free','member','insider')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Privileges — the role-escalation guard.
-- Revoke any blanket DML (Supabase default privileges may grant it), then grant
-- back ONLY the safe columns. `role` and `tier` are deliberately omitted.
-- ─────────────────────────────────────────────────────────────────────────────
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant insert (id, handle, display_name, bio, country, language, interests, occupation, avatar_url)
  on public.profiles to authenticated;
grant update (handle, display_name, bio, country, language, interests, occupation, avatar_url)
  on public.profiles to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Profiles are public (community pages, comment authorship, bylines).
drop policy if exists "Public read profiles" on public.profiles;
create policy "Public read profiles"
  on public.profiles for select
  using (true);

-- A signed-in user may create their own row (self-heals if the trigger missed it).
drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

-- A signed-in user may edit their own row (column grants above still block role/tier).
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-create a profile row whenever a new auth user signs up.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, handle)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(coalesce(new.email,'reader'),'@',1)),
    lower(regexp_replace(coalesce(split_part(new.email,'@',1),'reader'), '[^a-z0-9]', '', 'g'))
      || '-' || substr(replace(new.id::text,'-',''),1,4)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill any existing auth users (e.g. the founder, who has logged in before)
-- so they get a profile row that the security migration can promote to editor.
insert into public.profiles (id, display_name, handle)
select u.id,
       coalesce(nullif(u.raw_user_meta_data->>'full_name',''), split_part(coalesce(u.email,'reader'),'@',1)),
       lower(regexp_replace(coalesce(split_part(u.email,'@',1),'reader'),'[^a-z0-9]','','g'))
         || '-' || substr(replace(u.id::text,'-',''),1,4)
from auth.users u
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: is this user a newsroom editor? Used by the security migration's RLS.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.is_editor(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = uid and role in ('editor','admin'));
$$;

grant execute on function public.is_editor(uuid) to anon, authenticated;

comment on table public.profiles is
  'Reader/editor profiles. role gates the CMS + sensitive tables; role/tier are not column-granted to authenticated, so users cannot self-promote.';
