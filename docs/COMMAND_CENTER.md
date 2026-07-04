# Newsroom Command Center — editorial approval gate

The Command Center (**Admin → ⌖ Command**) is the desk where every incoming wire
story is triaged **before** it can reach the public front page. It is the
business‑critical control between the raw RSS feeds and what readers see.

## What changed about the workflow

Previously, wire stories auto‑published straight to the site. Now:

1. The wire pull (`/api/pull-wire`, cron every 15 min or the **Pull live wire**
   button) inserts each new story with **`status = 'review'`** — it lands in the
   Command Center queue, **not** on the front page.
2. An editor reviews it on the tactical map + queue and either
   - **✓ Approve → Front page** (`status = 'published'`) — it goes live, or
   - **✕ Reject** (`status = 'rejected'`) — kept out of public view, on record.
3. The public only ever sees `published` stories (enforced in the database by
   Row‑Level Security — `review`/`rejected` rows are visible only to editors).

Stories you'd already published stay published — only *new* wire is gated.

## Required one‑time setup (run the SQL)

The live database must allow the new `review`/`rejected` statuses. Run
`supabase/migrations/20260708120000_article_review_status.sql` once in the
**Supabase → SQL Editor** (same place you ran the earlier phase migrations).
Until it's applied, wire ingestion and the Reject button will error (approving
still works, because `published` was always allowed).

> **Sequence:** run this SQL as soon as the deploy lands. The public site keeps
> serving already‑published stories throughout; only the intake of *new* wire
> pauses until the SQL is in.

## Using it

- **The map** spans the continent **and the island nations** (Cabo Verde, São
  Tomé, Comoros, Seychelles, Madagascar, Mauritius). A gold badge on a bureau =
  that many stories awaiting review from there. **Tap a bureau** to filter the
  queue to that place; tap again (or **✕ clear**) to reset.
- **Filter chips** (Mining, Markets, Tech…) narrow the queue by vertical.
- **Per story:** ✓ Approve, ✕ Reject, **Source ↗** (read the original), **✎ Open**
  (edit in the CMS before approving).
- **Bulk:** tick the checkboxes and **Approve/Reject selected**, or **Approve all
  shown** to clear a filtered batch in one click.
- **HUD stats:** Awaiting review · Approved today · Rejected · Nations in queue.

## Where it lives in the code

`public/afripulse-preview.html`:
- `viewAdminCommand()` — the screen; `renderCommandMap()` — the tactical map;
  `commandQueueHTML()` — the queue; `bindCommandCenter()` — interactions.
- `ISLAND_HUBS` / `COMMAND_HUBS` — bureaux incl. island nations (edit to add one).
- `setArticleStatus()` / `ccBulk()` — persist approve/reject to Supabase.
- Styling: the `.cc-*` classes (search `NEWSROOM COMMAND CENTER` in the `<style>`).

**Revert to auto‑publish** (if ever needed): in `api/pull-wire.js`, change the two
`status:'review'` back to `status:'published'`. Nothing else depends on the gate.
