# Phase 1 — Reader Accounts & Profiles

Readers can now create a free account, build a public profile (photo, bio,
country, language, interests, occupation), and — once Phase 2 lands — comment on
stories. This is the data-capture + engagement foundation: the fields readers
give us are exactly what powers the "sell by language & region" ad model.

## ⚠️ Deploy order matters (read this first)

Introducing reader accounts changes what "a signed-in user" means. Before this,
_authenticated = admin_, so admin-only tables (newsletter **subscribers**,
investor **leads**, article writes) were open to any authenticated user. Now that
**anyone** can sign up, those tables must be re-gated on an **editor** role — that
is exactly what migration #3 below does.

**So: run all three migrations BEFORE you deploy the reader-signup front end.**
If the signup UI went live while the old policies were still in place, a brand-new
reader could read your subscriber list and investor leads. Run the SQL first, then
deploy. (Server functions use the service-role key and are unaffected either way.)

## The three migrations (Supabase → SQL Editor, in order)

1. `supabase/migrations/20260705120000_profiles.sql`
   The `profiles` table, an auto-create trigger for new signups, a backfill for
   existing users, and the `is_editor()` helper. Readers can edit their own
   profile but **cannot** change their `role`/`tier` (enforced by column
   privileges — a reader can never self-promote to editor).
2. `supabase/migrations/20260705130000_avatars_storage.sql`
   A public `avatars` storage bucket; each user can only write into their own
   `<user-id>/` folder.
3. `supabase/migrations/20260705140000_reader_auth_security.sql`
   **The security one.** Re-gates articles / subscribers / leads / feeds / taxonomy
   / article-media uploads on `is_editor(auth.uid())`, and **promotes you to
   editor**.

### Make sure you're an editor

Migration #3 promotes `lawtondj@gmail.com` to editor. If your admin login uses a
**different** email, edit that line before running it (or run this afterwards):

```sql
update public.profiles set role='editor'
where id = (select id from auth.users where lower(email)=lower('YOUR_EMAIL_HERE'));
```

To add more editors later, run the same statement with their email. To verify:

```sql
select email, role from auth.users u join public.profiles p on p.id=u.id
where role in ('editor','admin');
```

## How it behaves

- **Guests** see a **Sign in** button (top bar) → `#/join`, the free-signup form.
- **Signing up** captures name, email, country, language, interests, occupation
  (progressive — a little now, more later). Magic-link, no password.
- **Readers** get an avatar menu → **My profile** (`#/me`), where they edit their
  profile and upload a photo. Public profiles live at `#/u/<handle>`.
- **Editors** additionally see **Newsroom** in the menu; `#/admin` is now gated on
  editor role (a plain reader who visits it gets a friendly "editors only" page —
  and RLS blocks them at the database even if they bypass the UI).

## What was verified

- All 13 migrations apply cleanly in order against a real Postgres 16.
- 18/18 security assertions pass: founder auto-promoted to editor and keeps full
  access; a new reader is auto-given a `reader` profile, **cannot** self-promote,
  **cannot** read subscribers or leads, **cannot** write articles, and sees only
  published articles. Editors retain full CMS access.
- The SPA builds, `npm test` passes (36), and `#/join` + `#/me` render with zero
  page errors. Reference screenshots: `docs/design/phase1-*.png`.

## Next phases

- **Phase 2 — Comments & moderation** ✅ built — see
  [`PHASE2_COMMENTS.md`](./PHASE2_COMMENTS.md).
- **Phase 3 — Paid tiers** (Stripe checkout; the `tier` column is ready).
- Localizing the reader UI (join/profile/comments) into FR/AR/SW/PT — currently English.
