-- AfriPulse Times — article image storage
--
-- Backs the admin editor's "Upload image" control. Creates a PUBLIC storage
-- bucket for article hero images and the Row Level Security policies on
-- storage.objects that let signed-in editors upload/replace/remove images while
-- keeping the files publicly readable (so <img src> works for every visitor).
--
-- Supabase enables RLS on storage.objects by default and ships with a stock
-- "give users access to own folder" set of policies; the ones below are scoped
-- to this bucket and are safe to add alongside them.

-- ─────────────────────────────────────────────────────────────────────────────
-- Bucket (public read; 5 MB per object; common image mime types)
-- ─────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'article-media',
  'article-media',
  true,
  5242880,
  array['image/png','image/jpeg','image/webp','image/gif','image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ─────────────────────────────────────────────────────────────────────────────
-- Policies on storage.objects, scoped to the article-media bucket
-- ─────────────────────────────────────────────────────────────────────────────

-- Anyone (anon + authenticated) may read — the bucket is public.
drop policy if exists "Public read article media" on storage.objects;
create policy "Public read article media"
  on storage.objects for select
  using (bucket_id = 'article-media');

-- Only signed-in editors may upload.
drop policy if exists "Authenticated upload article media" on storage.objects;
create policy "Authenticated upload article media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'article-media');

-- Only signed-in editors may replace an existing object.
drop policy if exists "Authenticated update article media" on storage.objects;
create policy "Authenticated update article media"
  on storage.objects for update to authenticated
  using (bucket_id = 'article-media')
  with check (bucket_id = 'article-media');

-- Only signed-in editors may delete.
drop policy if exists "Authenticated delete article media" on storage.objects;
create policy "Authenticated delete article media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'article-media');
