-- AfriPulse Times — add server-generated FR/AR translations to articles.
--
-- /api/translate fills this with { "fr": {headline, standfirst, body[]},
-- "ar": {...} }. The front end swaps these in when the reader selects French or
-- Arabic; English (or an untranslated article) renders the original. NULL means
-- "not translated yet".

alter table public.articles
  add column if not exists translations jsonb;

comment on column public.articles.translations is
  'Server-generated translations of headline/standfirst/body, keyed by language code (fr, ar). NULL = not yet translated.';
