-- AfriPulse Times — reader-vs-editor security (Phase 1).
--
-- WHY THIS EXISTS: before reader accounts, "authenticated" meant "a newsroom
-- admin", so admin-only tables were gated on `to authenticated`. Now that ANY
-- visitor can create an account, "authenticated" includes every reader — so
-- those same policies would let a reader read the newsletter list, the investor
-- leads, or even edit articles. This migration re-gates every admin-only policy
-- on public.is_editor(auth.uid()) instead, and promotes the founder to editor.
--
-- Public reading of PUBLISHED articles + taxonomy is untouched — the site still
-- works for signed-out visitors. Server functions use the service-role key and
-- bypass RLS, so /api/subscribe, /api/contact, /api/pull-wire etc. are unaffected.
--
-- Safe to re-run: every policy is dropped-if-exists before being (re)created, and
-- the article_views section is skipped if that (optional) table isn't present.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Promote the founder to editor. CHANGE / ADD emails as needed; to add more
--    editors later, run:  update public.profiles set role='editor'
--      where id = (select id from auth.users where lower(email)=lower('them@x.com'));
-- ─────────────────────────────────────────────────────────────────────────────
update public.profiles p
   set role = 'editor'
  from auth.users u
 where p.id = u.id
   and lower(u.email) in (
     lower('lawtondj@gmail.com')
   );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. articles — writes + draft reads are editor-only; public still reads published
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Authenticated read all articles" on public.articles;
drop policy if exists "Authenticated insert articles"   on public.articles;
drop policy if exists "Authenticated update articles"   on public.articles;
drop policy if exists "Authenticated delete articles"   on public.articles;
drop policy if exists "Editors read all articles" on public.articles;
drop policy if exists "Editors insert articles"   on public.articles;
drop policy if exists "Editors update articles"   on public.articles;
drop policy if exists "Editors delete articles"   on public.articles;

create policy "Editors read all articles"
  on public.articles for select to authenticated
  using (public.is_editor(auth.uid()));
create policy "Editors insert articles"
  on public.articles for insert to authenticated
  with check (public.is_editor(auth.uid()));
create policy "Editors update articles"
  on public.articles for update to authenticated
  using (public.is_editor(auth.uid())) with check (public.is_editor(auth.uid()));
create policy "Editors delete articles"
  on public.articles for delete to authenticated
  using (public.is_editor(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Sensitive tables (emails, enquiries, feeds) — editor-only. These previously
--    had a broad "Authenticated full access" policy.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Authenticated full access" on public.subscribers;
drop policy if exists "Editors manage subscribers" on public.subscribers;
create policy "Editors manage subscribers"
  on public.subscribers for all to authenticated
  using (public.is_editor(auth.uid())) with check (public.is_editor(auth.uid()));

drop policy if exists "Authenticated full access" on public.leads;
drop policy if exists "Editors manage leads" on public.leads;
create policy "Editors manage leads"
  on public.leads for all to authenticated
  using (public.is_editor(auth.uid())) with check (public.is_editor(auth.uid()));

drop policy if exists "Authenticated full access" on public.rss_sources;
drop policy if exists "Editors manage rss_sources" on public.rss_sources;
create policy "Editors manage rss_sources"
  on public.rss_sources for all to authenticated
  using (public.is_editor(auth.uid())) with check (public.is_editor(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Taxonomy tables — public read stays; only editors may WRITE.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Authenticated full access" on public.authors;
drop policy if exists "Editors manage authors" on public.authors;
create policy "Editors manage authors"
  on public.authors for all to authenticated
  using (public.is_editor(auth.uid())) with check (public.is_editor(auth.uid()));

drop policy if exists "Authenticated full access" on public.verticals;
drop policy if exists "Editors manage verticals" on public.verticals;
create policy "Editors manage verticals"
  on public.verticals for all to authenticated
  using (public.is_editor(auth.uid())) with check (public.is_editor(auth.uid()));

drop policy if exists "Authenticated full access" on public.regions;
drop policy if exists "Editors manage regions" on public.regions;
create policy "Editors manage regions"
  on public.regions for all to authenticated
  using (public.is_editor(auth.uid())) with check (public.is_editor(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. article_views — anyone still records a view; only editors read the log.
--    Optional table (dashboard page-view counter); skip cleanly if it isn't there.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.article_views') is not null then
    execute 'drop policy if exists "Authenticated can read views" on public.article_views';
    execute 'drop policy if exists "Editors can read views" on public.article_views';
    execute 'create policy "Editors can read views" on public.article_views for select to authenticated using (public.is_editor(auth.uid()))';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Storage: article media uploads are editor-only (avatars stay open to all
--    signed-in users — that's handled in the avatars migration).
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Authenticated upload article media" on storage.objects;
drop policy if exists "Editors upload article media" on storage.objects;
create policy "Editors upload article media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'article-media' and public.is_editor(auth.uid()));

drop policy if exists "Authenticated update article media" on storage.objects;
drop policy if exists "Editors update article media" on storage.objects;
create policy "Editors update article media"
  on storage.objects for update to authenticated
  using (bucket_id = 'article-media' and public.is_editor(auth.uid()))
  with check (bucket_id = 'article-media' and public.is_editor(auth.uid()));

drop policy if exists "Authenticated delete article media" on storage.objects;
drop policy if exists "Editors delete article media" on storage.objects;
create policy "Editors delete article media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'article-media' and public.is_editor(auth.uid()));
