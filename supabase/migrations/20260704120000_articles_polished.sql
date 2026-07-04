-- AfriPulse Times — mark when a wire (RSS) article has been AI-polished.
--
-- /api/polish rewrites choppy, truncated RSS text into a clean, coherent
-- AfriPulse news brief (facts only, no invented content), then stamps this
-- column. NULL = not yet polished. The original wire text is preserved inside
-- payload.wire_original so the pass is fully reversible.
--
-- The polish pass filters on `.is('polished_at', null)` exactly like the
-- translation pass filters on `.is('translations', null)`, so it only ever
-- touches each article once and is safe to run repeatedly.

alter table public.articles
  add column if not exists polished_at timestamptz;

comment on column public.articles.polished_at is
  'When /api/polish rewrote this RSS article into a clean AfriPulse brief. NULL = not yet polished. Original text kept in payload.wire_original.';

-- Speeds up the "next batch of unpolished wire items" query.
create index if not exists articles_polish_queue_idx
  on public.articles (published_at desc)
  where source = 'rss' and polished_at is null;
