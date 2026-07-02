-- AfriPulse Times — add Swahili (sw) + Portuguese (pt) to the accepted languages
--
-- The subscribers + leads tables constrain `language` to a fixed set. Widen both
-- to include the two new languages so a Swahili/Portuguese reader can subscribe
-- or send an enquiry. articles.translations is jsonb (no constraint), so it
-- already accepts sw/pt keys once /api/translate produces them.

alter table public.subscribers drop constraint if exists subscribers_language_check;
alter table public.subscribers
  add constraint subscribers_language_check check (language in ('en','fr','ar','sw','pt'));

alter table public.leads drop constraint if exists leads_language_check;
alter table public.leads
  add constraint leads_language_check check (language in ('en','fr','ar','sw','pt'));
