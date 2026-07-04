# AfriPulse Times — Feature Guide (how to use & edit)

Plain-language guide to the newer "wow" features, and exactly where to change
each one. Everything lives in `public/afripulse-preview.html` unless noted.

---

## 🌍 Live coverage map ("One pulse · 54 nations")

The glowing map of Africa on the home page. Each dot is a bureau; dots glow and
pulse, sized by how many live stories carry that city's dateline. The three stats
(Nations active · Bureaux · Stories live) are computed live and count up.

**To add, move, or rename a bureau** — edit the `COVERAGE_HUBS` list (search the
file for `const COVERAGE_HUBS`):

```js
const COVERAGE_HUBS = [
  {city:'Cairo', x:56, y:14},
  {city:'Lagos', x:31, y:47},
  // add your own:
  {city:'Kigali', x:55, y:56},
];
```
- `x` / `y` are positions on a 100 × 105 grid (0,0 = top-left). Africa fills most
  of it: **x** ~6 (west) → ~78 (Horn); **y** ~8 (north) → ~96 (Cape Town). Nudge
  the numbers until the dot sits where you want.
- A dot's size grows automatically with the number of published stories whose
  **dateline** starts with that city's first word (e.g. "Lagos", "Cape").
- To recolour: the map's CSS classes start with `.cmap-` (search `LIVE COVERAGE MAP`).

**It's interactive (desktop + mobile):** tap a glowing city and a panel opens with
up to 10 stories from that **region** (with the tapped city's own stories on top),
each a thumbnail + link straight to the article, plus a "See all <region>
coverage" link. Extras:
- **Live count badges** on each city; node size scales with activity.
- **Topic filter chips** (Mining, Markets, Tech…) re-weight the whole map.
- **Region glow** — tapping a city softly lights its whole region.
- **Hottest bureau** pulses brighter and gently auto-opens once per visit.
- **Shareable deep links** — `#/map/nairobi` opens the map with Nairobi selected.

To change what a city links to, edit `articlesForHub` / `hubLocalCount`; the panel
is `fillHubPanel` and the styling is the `.cmap-*` CSS.

**Demo tip:** it's the strongest single visual you have — tap through a few regions
live, or leave the home page on it.

---

## 🔊 Listen to this article (text-to-speech)

On every article page, the green **"Listen"** button reads the story aloud in the
reader's current language, using the browser's built-in voice (free, works
offline). Click again to stop; it also stops when you leave the article.

- **Languages:** EN, FR, AR, SW, PT. Actual voice quality depends on the reader's
  device/browser — if it has no voice for a language it uses its default. Nothing
  to configure.
- **To change the button labels per language:** edit the `listenLabel()` map
  (search `function listenLabel`).
- **To change reading speed:** in `toggleListen()`, adjust `u.rate = 1` (0.8 =
  slower, 1.2 = faster).

---

## ✦ Polish wire (admin) — clean up sourced stories with AI

RSS feeds often give us **truncated, choppy, boilerplate-laden** text. Two layers
fix this:

1. **Free cleanup (automatic, no AI).** Every time the wire is pulled, we now
   prefer the fuller article text a feed ships, strip boilerplate ("The post …
   appeared first on …", "Read more"), decode HTML entities, split into real
   paragraphs, and stop cutting mid-sentence. This happens for free in
   `api/pull-wire.js`.
2. **AI polish (on demand or daily).** **Admin → Articles → "✦ Polish wire"**
   rewrites choppy wire stories into clean, coherent **AfriPulse briefs** via
   Claude — **facts only, nothing invented** — in the house voice.

- Polishes up to **8 wire stories per click** — click again for more.
- **Non-destructive:** the original wire text is kept (in `payload.wire_original`),
  and every story keeps its "Read at source ↗" link. Polished stories show a small
  "Summarised for clarity by AfriPulse AI" note for honesty.
- Runs **before** translation (daily crons: wire 06:00 → polish 06:15 →
  translate 06:30 UTC), so the five-language versions are built from the clean text.
- Needs `ANTHROPIC_API_KEY` in Vercel (same key as Translate) and the
  `20260704120000_articles_polished.sql` migration. Clear error toast if not set.

**Demo gold:** open a raw wire story, hit ✦ Polish wire, and watch the choppy
snippet become a clean two-paragraph brief — "our AI desk just sub-edited that."

---

## ✦ One-click Translate (admin)

**Admin → Articles → "✦ Translate"** batch-translates published articles into
French, Arabic, Swahili and Portuguese via Claude, then refreshes so they appear.

- Translates up to **8 articles per click** — click again for more.
- Safe to click repeatedly (already-translated articles are skipped).
- Needs `ANTHROPIC_API_KEY` set in Vercel; you'll get a clear error toast if not.

**Demo gold:** open an English story on stage, hit ✦ Translate, switch the site to
Swahili — the article rewrites itself live. "Our AI just did that in real time."

---

## ✦ AI "Key points" (TL;DR)

Articles can show a highlighted **"Key points"** box — a 3-bullet AI summary — in
the reader's language. The summaries are generated **during the ✦ Translate pass**
(cached in the article, in all five languages), so they appear instantly for every
reader with no per-view cost.

- **To populate them:** run ✦ Translate (admin). New articles get translations +
  key points together. Articles without a translation simply don't show the box.
- **Label per language** is in `tldrLabel()`; the box styling is `.art-tldr` in CSS.

---

## 🌐 Language switcher

Top bar: **EN · FR · AR · SW · PT**. The whole interface (nav, labels, dates,
forms, footer) localizes instantly; Arabic switches to right-to-left. Article
*bodies* localize once they've been translated (see ✦ Translate above); until
then a small honest ribbon tells readers translation is rolling out.

- **UI wording** lives in the big `LANG` object (search `const LANG =`). Every key
  exists in all five languages — `npm test` fails if one is missing, so nothing
  can be half-translated.
- **Reader-facing surfaces** added later — the live coverage map + its story
  panel, sign-up/profile pages, comments, and the membership/upgrade pages — are
  localized through a second dictionary, `RUI` (search `const RUI =`), read via
  `rt('key')`. The five languages sit adjacent per key so they can't drift, and
  `tests/reader-i18n.test.mjs` fails the build if any key is missing, blank, or
  has mismatched `%s`/`%c` placeholders across languages. To add a string, add a
  `key:{en,fr,ar,sw,pt}` row to `RUI` and reference it with `rt('key')`.

---

## 📊 Traction dashboard

**Admin → Dashboard** (`#/admin/metrics`) — the live "command center": stories,
nations active (against the 54 goal), subscribers, enquiries, page views,
publishing cadence, coverage by vertical, translation coverage, wire status, and
most-read. Auto-refreshes every 30s. Details in `INVESTOR_READINESS.md`.

---

## 💼 Advertising & the media kit (`#/advertise`)

A polished, advertiser-facing **media kit** at `#/advertise` (linked from the
footer "Advertise" and from every ad slot). It sells the placements large
brands actually want — not just banners:

- **Signature packages:** Continental Anchor (full takeover), Coverage-Map
  Sponsor (the prestige brand halo), Language & Region (sell one of the five
  editions or one region), and Native In-Read (always-on).
- **The insight:** AfriPulse's scarcest inventory is the ability to sell a brand
  a *language* or a *region* and the coverage-map halo — that's what the page leads with.

Where the placements live in the site:
- **Native in-read unit** — woven into the middle of every article ≥3 paragraphs
  (search `renderAdSlotInArticle`). Tasteful by design: one per story.
- **Coverage-map sponsor line** — under the live map (search `cmap-sponsor`).
- **Homepage banner / right-rail panel** — `renderAdSlotBanner` / `renderAdSlotMini`.

**To edit packages, reach numbers, or copy:** all English B2B copy is in
`viewAdvertise()` (search `function viewAdvertise`) — edit the `packages`,
`inventory`, `reach`, and `trust` arrays. The reach stats (nations, bureaux) are
computed live where possible. Styling is the `.adv-*` / `.ad-native` CSS. The
booking button points to `advertise@afripulsetimes.com`.

**Demo tip:** open a story to show the native unit reads as premium (not spammy),
then click "Advertise" to reveal the media kit — proof there's a real revenue model.

---

## 👤 Reader accounts & profiles (Phase 1)

Readers can create a free account and a public profile (photo, bio, country,
language, interests, occupation). Guests see **Sign in** in the top bar →
`#/join`; signed-in readers get an avatar menu → **My profile** (`#/me`); public
profiles are at `#/u/<handle>`.

- **Security:** `#/admin` and all sensitive tables (subscribers, leads, article
  writes) are now gated on an **editor** role, enforced in the database (RLS) — a
  normal reader can never reach the CMS or your subscriber/lead lists, and can't
  promote themselves. Full setup + the important deploy order are in
  [`PHASE1_READER_ACCOUNTS.md`](./PHASE1_READER_ACCOUNTS.md).
- **Data capture:** the signup fields (country, language, interests) are the exact
  segments that power the "sell by language & region" ad model.
- **Editing:** reader-facing views live in `viewJoin` / `viewMe` /
  `viewPublicProfile`; the role/tier model is in the `profiles` table.

---

## 💬 Comments & moderation (Phase 2)

Signed-in readers comment on articles (with one-level replies), like, and report;
guests see a "Sign in to comment" prompt. Comments that get **3 reports
auto-hide** for review. Editors moderate inline (a **Hide** button on each
comment) and from **Admin → Comments** (all comments, most-reported first, with
Approve / Hide / Delete). Readers can edit/delete only their own; the public only
sees visible comments — all enforced in the database. Needs the
`20260706120000_comments.sql` migration. Full details in
[`PHASE2_COMMENTS.md`](./PHASE2_COMMENTS.md).

---

## 💳 Membership / paid tiers (Phase 3)

Readers can subscribe as **Member** ($5/mo · $50/yr) or **Insider** ($18/mo ·
$180/yr) via **Stripe Checkout** at `#/upgrade` (also linked from the profile and
footer). Members read **ad-light**. A reader's tier is set only by the Stripe
webhook after payment — never by the browser — and canceling flips them back to
free automatically. Setup (Stripe products, keys, webhook) and the important
merchant-country note are in [`PHASE3_SUBSCRIPTIONS.md`](./PHASE3_SUBSCRIPTIONS.md).

---

## Editing content in general

- **Stories:** Admin → Articles (create / edit / publish / delete, upload images).
- **Bureaux on the map, button labels, reading speed:** small code edits above.
- After any code edit, `npm run build` locally to sanity-check, then push — Vercel
  redeploys automatically.
