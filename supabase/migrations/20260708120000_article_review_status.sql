-- AfriPulse Times — Newsroom Command Center editorial workflow. Safe to re-run.
--
-- The initial schema constrained articles.status to ('draft','published','archived'),
-- but the newsroom needs an editor-approval gate: incoming wire stories land as
-- 'review', and an editor either approves them (→ 'published', hits the front page)
-- or rejects them (→ 'rejected', kept out of public view for the record).
--
-- Public visibility is unchanged: the RLS read policy still exposes only
-- status='published' to anon; editors (public.is_editor) already read all rows,
-- so 'review'/'rejected' stories are visible only inside the Command Center.

alter table public.articles drop constraint if exists articles_status_check;
alter table public.articles
  add constraint articles_status_check
  check (status in ('draft','review','published','rejected','archived'));

-- Speed up the Command Center queue (the incoming, most-recent-first list).
create index if not exists articles_review_queue_idx
  on public.articles (status, published_at desc)
  where status = 'review';

comment on constraint articles_status_check on public.articles is
  'draft = authored WIP; review = awaiting editor approval (wire lands here); published = live on the front page; rejected = editor declined; archived = retired.';
