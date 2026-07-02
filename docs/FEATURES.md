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

**Demo tip:** it's the strongest single visual you have — leave the home page
scrolled to it, or screenshot it for the deck.

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

## ✦ One-click Translate (admin)

**Admin → Articles → "✦ Translate"** batch-translates published articles into
French, Arabic, Swahili and Portuguese via Claude, then refreshes so they appear.

- Translates up to **8 articles per click** — click again for more.
- Safe to click repeatedly (already-translated articles are skipped).
- Needs `ANTHROPIC_API_KEY` set in Vercel; you'll get a clear error toast if not.

**Demo gold:** open an English story on stage, hit ✦ Translate, switch the site to
Swahili — the article rewrites itself live. "Our AI just did that in real time."

---

## 🌐 Language switcher

Top bar: **EN · FR · AR · SW · PT**. The whole interface (nav, labels, dates,
forms, footer) localizes instantly; Arabic switches to right-to-left. Article
*bodies* localize once they've been translated (see ✦ Translate above); until
then a small honest ribbon tells readers translation is rolling out.

- **UI wording** lives in the big `LANG` object (search `const LANG =`). Every key
  exists in all five languages — `npm test` fails if one is missing, so nothing
  can be half-translated.

---

## 📊 Traction dashboard

**Admin → Dashboard** (`#/admin/metrics`) — the live "command center": stories,
nations active (against the 54 goal), subscribers, enquiries, page views,
publishing cadence, coverage by vertical, translation coverage, wire status, and
most-read. Auto-refreshes every 30s. Details in `INVESTOR_READINESS.md`.

---

## Editing content in general

- **Stories:** Admin → Articles (create / edit / publish / delete, upload images).
- **Bureaux on the map, button labels, reading speed:** small code edits above.
- After any code edit, `npm run build` locally to sanity-check, then push — Vercel
  redeploys automatically.
