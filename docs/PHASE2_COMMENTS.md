# Phase 2 — Comments & Moderation

Signed-in readers can now comment on articles, reply (one level), like, and report
comments. Editors moderate from the article itself and from a dedicated admin
**Comments** tab. Builds on the Phase 1 role model — the same `is_editor()` gate
protects everything.

## Setup — one migration

Run in Supabase → SQL Editor (after the Phase 1 migrations):

- `supabase/migrations/20260706120000_comments.sql` — the `comments`,
  `comment_likes`, and `comment_reports` tables, their RLS, count triggers, the
  auto-flag trigger, and the `moderate_comment()` RPC.

No new environment variables. Nothing else to configure.

## How it behaves

- **Readers** (signed in) see a compose box under every article; guests see a
  "Sign in to comment" prompt. They can reply, like, report, and **edit or delete
  their own** comments.
- **Auto-moderation:** a comment that collects **3 reports** is automatically
  hidden (status `flagged`) and surfaced to editors for review — so bad content
  disappears from public view without you watching the screen.
- **Editors** get a **Hide** action inline on every comment, plus **Admin →
  Comments**: all comments, most-reported first, with **Approve / Hide / Delete**.

## Security (verified against real Postgres)

The model mirrors Phase 1 and was proven with a 14-assertion test against a live
Postgres 16 (all 14 pass):

- A reader can only post **as themselves** (RLS `user_id = auth.uid()`); they
  cannot impersonate another user.
- A reader **cannot change moderation status** — they have no column privilege on
  `status`, and the `moderate_comment()` RPC refuses non-editors. Only editors
  (or the auto-flag trigger) change visibility.
- `like_count` / `report_count` are maintained by triggers only — readers can't
  inflate them.
- Authors can edit/delete their **own** comments; **editors** can moderate or
  delete **any**. The public only ever sees `visible` comments.

## Where it lives in the code

- **DB:** `supabase/migrations/20260706120000_comments.sql`.
- **Reader UI:** `loadComments` / `postComment` / `toggleCommentLike` /
  `reportComment` / `editCommentBody` / `deleteComment` / `moderateComment`, and
  `commentsSectionHTML` / `fillComments` / `commentNodeHTML` (search `COMMENTS
  (Phase 2)`). Rendered at the bottom of `viewArticle`.
- **Moderation UI:** `viewAdminComments` + the **Comments** tab in `adminShell`.
- **Styling:** the `.cmt-*` and `.cm-mod-*` CSS blocks.

Reference screenshots: `docs/design/phase2-comments.png` (thread) and
`docs/design/phase2-moderation.png` (admin).

## Not yet (future)

- Email notifications on replies to your comment.
- Rich text / @-mentions.
- Localizing the comment UI into FR/AR/SW/PT (currently English, like the rest of
  the reader UI).
