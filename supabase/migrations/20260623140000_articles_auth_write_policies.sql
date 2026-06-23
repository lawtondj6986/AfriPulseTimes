-- AfriPulse Times — explicit article write policies (admin auth).
--
-- Replaces the broad "Authenticated full access" policy on articles with
-- granular policies so the intent is unambiguous: only authenticated users may
-- INSERT, UPDATE, or DELETE articles. Public (anon) access stays read-only and
-- limited to published rows via the existing "Public read published articles"
-- policy, so signed-out visitors can still read the site.

drop policy if exists "Authenticated full access" on public.articles;

-- Authenticated users can read every article, including drafts and archived.
create policy "Authenticated read all articles"
  on public.articles for select to authenticated
  using (true);

create policy "Authenticated insert articles"
  on public.articles for insert to authenticated
  with check (true);

create policy "Authenticated update articles"
  on public.articles for update to authenticated
  using (true) with check (true);

create policy "Authenticated delete articles"
  on public.articles for delete to authenticated
  using (true);
