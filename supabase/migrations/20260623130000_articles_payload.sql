-- AfriPulse Times — add a JSONB payload column to articles.
--
-- The front-end (afripulse-preview.html) uses a richer article model than the
-- typed columns capture: kicker, byline (free text), dateline, readingMin,
-- emoji, color, tags[], a media{} object, and body as an array of paragraphs.
-- `payload` stores that full object so the store round-trips losslessly without
-- changing what the page renders. The typed columns remain the queryable,
-- RLS-governed mirror (status, vertical, region, author_slug, published_at, …)
-- used by SQL, the public API, and Row Level Security.

alter table public.articles
  add column if not exists payload jsonb;

comment on column public.articles.payload is
  'Full front-end article object for lossless round-trip with afripulse-preview.html. Typed columns mirror the queryable subset.';
