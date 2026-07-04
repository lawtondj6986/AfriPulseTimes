-- AfriPulse Times — comments & moderation (Phase 2).
--
-- Signed-in readers comment on articles (one level of threaded replies), like and
-- report comments. Comments are public when status='visible'; editors can hide /
-- restore / delete any comment, and a comment auto-flags (hides) once it passes a
-- report threshold. Security mirrors Phase 1: readers act only as themselves and
-- cannot moderate; only editors (public.is_editor) can change moderation status.

-- ─────────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.comments (
  id           uuid primary key default gen_random_uuid(),
  article_slug text not null references public.articles(slug) on update cascade on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  parent_id    uuid references public.comments(id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 2000),
  status       text not null default 'visible' check (status in ('visible','hidden','flagged')),
  like_count   int  not null default 0,
  report_count int  not null default 0,
  edited       boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists comments_article_idx on public.comments (article_slug, created_at);
create index if not exists comments_parent_idx  on public.comments (parent_id);
create index if not exists comments_status_idx   on public.comments (status, created_at desc);

create table if not exists public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table if not exists public.comment_reports (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  reason     text,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Triggers: denormalised counts, auto-flag, and the moderation guard
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.comments_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.comments set like_count = like_count + 1 where id = new.comment_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.comments set like_count = greatest(0, like_count - 1) where id = old.comment_id;
    return old;
  end if;
  return null;
end $$;
drop trigger if exists comment_likes_count on public.comment_likes;
create trigger comment_likes_count
  after insert or delete on public.comment_likes
  for each row execute function public.comments_like_count();

-- Auto-flag: once a comment collects REPORT_THRESHOLD reports it is hidden from the
-- public (status='flagged') for an editor to review.
create or replace function public.comments_report_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare c int;
begin
  update public.comments set report_count = report_count + 1
    where id = new.comment_id returning report_count into c;
  if c >= 3 then
    update public.comments set status = 'flagged' where id = new.comment_id and status = 'visible';
  end if;
  return new;
end $$;
drop trigger if exists comment_reports_count on public.comment_reports;
create trigger comment_reports_count
  after insert on public.comment_reports
  for each row execute function public.comments_report_count();

-- Guard: keep author/created_at immutable and maintain edited/updated_at. It does
-- NOT touch status or the counts — those are not writable by users (see column
-- grants below), so the count/auto-flag triggers and the moderation RPC can update
-- them freely without this guard reverting their work.
create or replace function public.comments_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  if new.body is distinct from old.body then new.edited := true; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists comments_guard on public.comments;
create trigger comments_guard
  before update on public.comments
  for each row execute function public.comments_before_update();

-- Moderation is editor-only, via this SECURITY DEFINER RPC. Users have no column
-- privilege on `status` (below), so this is the only way status changes (besides
-- the auto-flag trigger). It self-checks is_editor, so a reader calling it fails.
create or replace function public.moderate_comment(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_editor(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_status not in ('visible','hidden','flagged') then
    raise exception 'invalid status %', p_status;
  end if;
  update public.comments set status = p_status where id = p_id;
end $$;
grant execute on function public.moderate_comment(uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Privileges — column-scoped so readers can't inflate counts or set status on insert
-- ─────────────────────────────────────────────────────────────────────────────
revoke all on public.comments, public.comment_likes, public.comment_reports from anon, authenticated;
grant select on public.comments to anon, authenticated;
grant insert (article_slug, user_id, parent_id, body) on public.comments to authenticated;
grant update (body) on public.comments to authenticated;   -- status changes only via moderate_comment() RPC
grant delete on public.comments to authenticated;

grant select on public.comment_likes to anon, authenticated;
grant insert (comment_id, user_id) on public.comment_likes to authenticated;
grant delete on public.comment_likes to authenticated;

grant select on public.comment_reports to authenticated;
grant insert (comment_id, user_id, reason) on public.comment_reports to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.comments        enable row level security;
alter table public.comment_likes   enable row level security;
alter table public.comment_reports enable row level security;

-- comments: public reads visible; editors read everything.
create policy "Public read visible comments" on public.comments for select using (status = 'visible');
create policy "Editors read all comments" on public.comments for select to authenticated using (public.is_editor(auth.uid()));
create policy "Users insert own comments" on public.comments for insert to authenticated with check (user_id = auth.uid());
create policy "Users update own comments" on public.comments for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Editors update any comment" on public.comments for update to authenticated using (public.is_editor(auth.uid())) with check (public.is_editor(auth.uid()));
create policy "Users delete own comments" on public.comments for delete to authenticated using (user_id = auth.uid());
create policy "Editors delete any comment" on public.comments for delete to authenticated using (public.is_editor(auth.uid()));

-- likes: anyone reads (for counts), a user manages only their own like.
create policy "Public read comment likes" on public.comment_likes for select using (true);
create policy "Users like as themselves" on public.comment_likes for insert to authenticated with check (user_id = auth.uid());
create policy "Users remove own like" on public.comment_likes for delete to authenticated using (user_id = auth.uid());

-- reports: a user files as themselves; only editors can read the report log.
create policy "Users report as themselves" on public.comment_reports for insert to authenticated with check (user_id = auth.uid());
create policy "Editors read reports" on public.comment_reports for select to authenticated using (public.is_editor(auth.uid()));

comment on table public.comments is
  'Reader comments on articles (one-level threads). status gates public visibility; only editors change it (comments_guard trigger). Auto-flags at 3 reports.';
