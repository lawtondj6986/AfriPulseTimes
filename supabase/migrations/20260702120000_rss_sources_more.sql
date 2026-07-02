-- AfriPulse Times — additional wire sources
--
-- Supplements the 12 sources seeded in the initial schema with a few more
-- reputable, African-focused feeds that tend to ship images (media:content /
-- thumbnails), so the live wire looks richer. Safe + idempotent: `on conflict
-- (url) do nothing` means re-running (or overlap with existing rows) is harmless.
-- pull-wire fetches each independently, so any feed that ever fails is just
-- skipped and logged.

insert into public.rss_sources (url, label, hint_vertical, active) values
  ('https://www.africanews.com/feed/rss',           'Africanews',          'front',   true),
  ('https://www.theafricareport.com/feed/',          'The Africa Report',   'markets', true),
  ('https://nairametrics.com/feed/',                 'Nairametrics',        'markets', true),
  ('https://www.okayafrica.com/rss/',                'OkayAfrica',          'culture', true),
  ('https://venturesafrica.com/feed/',               'Ventures Africa',     'markets', true)
on conflict (url) do nothing;
