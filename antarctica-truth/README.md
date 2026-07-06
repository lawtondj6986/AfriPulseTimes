# Antarctica Truth Project — Website

A single-page, offline-capable research site that separates the **documented history**
of Antarctica in the 20th century from the **constructed mythology** built on top of it,
and celebrates the continent's genuine **deep-time** history (170+ million years before
the first humans).

The visual system is a **declassified intelligence dossier**: the conspiracy myth is
presented as the *classified fabrication* — redacted, stamped, suspect — while the
documented record is the *DECLASSIFIED truth*, rendered in cyan. Classification banners,
an ink-stamped cover sheet, registration marks, and monospace data furniture carry that
concept through every section.

Everything lives in one self-contained file: **`index.html`**. No build step, no external
image files, no JavaScript frameworks. Just open it in a browser.

```
antarctica-truth/
├── index.html   # the entire site (HTML + Tailwind config + CSS + vanilla JS)
└── README.md    # this file
```

---

## What's inside `index.html`

- **Tailwind CSS 3.4+** via the official Play CDN (`https://cdn.tailwindcss.com`) with a
  custom MILSPEC `tailwind.config` palette (dark-only, AA+ contrast):
  - Base surfaces: ink `#05080D` · panel `#0A0F16` · raised `#0E1521` · steel hairlines `#26323F`
  - Text: muted `#AEBAC6` · bright `#EAF2F8`
  - Primary "scan" accent (the DECLASSIFIED record side, active states, reticles,
    neutrino canvas): cyan `#22D3EE` with `#67E8F9` highlight
  - Warning accent (classification stamps, banners, ideological-context flags, caution
    striping): amber `#FFB000` with `#FFC94D` highlight
- **Google Fonts**: JetBrains Mono (technical monospace workhorse — labels, data,
  headers, case numbers) + Saira Condensed (condensed grotesque display headings) +
  Inter (readable sans for long body prose), with graceful system fallbacks offline.
- **Declassified-dossier design language**:
  - Fixed **classification banners** top *and* bottom of the page
    ("UNCLASSIFIED // FOR PUBLIC RELEASE" / case-file footer), as on real classified docs.
  - A rotated **TOP SECRET → DECLASSIFIED ink stamp** in the hero (CSS-only, with a
    gradient mask for ink breakup, strike-through bar, and authority/date line).
  - **Sharp corners only** — 1px steel hairlines, no rounded cards, no glassmorphism
    blur, no soft shadows; panels read as printed report sections.
  - **L-shaped registration/crop marks** (`.crop`) on panel corners that draw in on
    hover/focus; corner reticles + a 90°S latitude motif on the cover sheet.
  - Dossier **section headers**: mono kicker ("SECTION II // MYTH-vs-RECORD LEDGER"),
    condensed display title, ruled line, right-aligned metadata cluster (FIG./ANNEX/REF).
  - Subtle **graph-paper coordinate grid** behind everything and an optional low-opacity
    **scanline overlay** (hidden under `prefers-reduced-motion` and in print).
  - **Amber diagonal hazard striping** on ideological-context flags (Zündel/Serrano) —
    grave and clear, not flippant.
  - Rectangular mono **bracketed buttons** ("[ EXPLORE THE EVIDENCE ]") with crisp
    invert-on-hover; no emoji anywhere (inline SVG line icons + ASCII glyphs only).
- **All imagery is code** — CSS gradients, inline SVG, and two `<canvas>` visuals
  (hero ice-sheet/starfield, and an IceCube neutrino-path schematic). HTML comments mark
  every place a real photo/dataset should be swapped in, with credit notes.
- **Data-driven content**: the Myth-vs-Record ledger and the Genealogy timeline are
  rendered from two JS arrays — `MYTH_RECORDS` and `GENEALOGY` — near the bottom of the
  file. **Edit those arrays to add or refine content; the UI regenerates automatically.**
  (v2 adds `caseId`/`origin` per myth record and `log`/`tag` per genealogy node for the
  case-file numbers and the chain-of-custody strip.)

### Sections
1. Classification banners (fixed, top + bottom) + sticky nav + mobile menu + REV badge
2. Hero "cover sheet" (case-file header, DECLASSIFIED stamp, typewriter tagline)
3. SECTION I — Project brief / executive summary (mono count-up readouts)
4. SECTION II — Interactive **Myth vs Record** ledger (search, filter, sort, redaction
   reveal, case-file modal, chain-of-custody Source Trail)
5. SECTION III — **Genealogy of the Fabrication** routing-log timeline (1938 → today)
6. SECTION IV — **Verified Expedition Records** (Neuschwabenland, Ahnenerbe Tibet,
   Operation Highjump — as Exhibits A–C)
7. SECTION V — **Deep Time annex** (Gondwana, Eocene forests & dinosaurs, ice onset ~34 Ma,
   Gamburtsev Mountains, ~400 subglacial lakes incl. Lake Vostok, 91+ buried volcanoes,
   radar mapping)
8. SECTION VI — **Instrument Testimony** (Clean Air Sector, IceCube, ANITA, buried
   Neumayer stations)
9. SECTION VII — Open Research Leads & How to Help
10. SECTION VIII — Source Register (categorized bibliography)

### Extra features
- **Redaction reveal**: in the ledger, each fabricated claim sits under a solid black
  redaction bar (with a mono "// REDACTED — HOVER TO LIFT" hint) that lifts on row hover
  *and* keyboard focus. The real text stays in the DOM for screen readers; only the
  visual bar is `aria-hidden`, and print removes the bars entirely.
- **Chain-of-custody strip** in the case-file modal, e.g.
  `FIRST LOGGED: 1947 · ORIGIN: L. SZABO (PRESS) · ROUTED → BERNARD 1964 → ZÜNDEL 1970s
  → SERRANO 1978–84` — routing hops are derived from the `GENEALOGY` data.
- **Myth Detector** mini-tool: type/select a claim → instant first-appearance year + author,
  rendered as a trace printout.
- Side section-navigation ticks + thin scroll-progress rule under the top banner.
- **Download CSV** of the current claim ledger (now includes the case-file column).
- **Print one-pager** (`window.print()`) with a dedicated `@media print` stylesheet for the
  table and timeline (white bg, black text, banners/stamp/scanlines removed — a plain-text
  control line replaces them — no page-break inside rows).
- Micro-interactions, all reduced-motion-safe: one-time **typewriter** hero tagline with a
  blinking block cursor, mono **count-up** stat readouts, a one-time **scanline sweep** on
  card reveal, and registration corners that draw in on hover.
- Scroll-triggered reveals via `IntersectionObserver`.
- Full `prefers-reduced-motion` support (typewriter/count-up render their final state
  immediately; sweeps, blinking, and the scanline field are disabled; canvases show a
  single static frame).

### Mobile optimization (v2.1)
- **No horizontal overflow at any width** — `overflow-x: clip` guard on `html`/`body`,
  the rotated DECLASSIFIED stamp is scaled/constrained below `sm`, long mono strings
  (chain-of-custody line, case ids) wrap with `overflow-wrap: anywhere`, and the only
  intentionally-wide element (the ledger table on tablets) scrolls inside its own
  `overflow-x: auto` wrapper.
- **Card ledger on phones**: below `sm` the Myth-vs-Record table renders as stacked
  dossier index-cards built from the same `MYTH_RECORDS` data and the same
  search/filter/sort state (a dedicated mobile sort select drives the table's
  `sortState`). Each card is keyboard-focusable, opens the case-file modal via
  Enter/Space/tap, and carries an explicit `[ OPEN CASE FILE ]` button. Print and
  CSV always use the real table/data.
- **Touch redaction reveal**: every amber `[FABRICATION]` redaction bar is overlaid by a
  real `<button>` (>= 44x44px hit area) with `aria-pressed` and the label
  *"Lift redaction to reveal fabricated claim"* — tap or Enter/Space toggles the reveal
  without opening the modal; hover/focus reveal is unchanged on desktop, and the bar's
  printed hint switches to "TAP TO LIFT" on touch devices.
- **Responsive classification banners**: banner height is a CSS variable (28px desktop,
  22px on phones) that also drives the nav offset, `scroll-padding-top` /
  `scroll-margin-top`, body bottom padding, and modal clearance; banners pad into the
  notch/home-indicator safe areas (`viewport-fit=cover` + `env(safe-area-inset-*)`).
  On small screens the decorative bottom banner auto-hides while scrolling down
  (kept `fixed` to preserve the both-edges dossier motif) and returns on scroll-up.
- **Dynamic viewport hero**: the cover sheet uses `100dvh` with a `100vh` fallback, so
  mobile browser chrome neither crops nor jumps the hero.
- **44px touch targets everywhere**: bracketed buttons enforce `min-height: 44px`,
  mobile menu links / search / filter / sort / detector inputs / modal close /
  timeline disclosures all clear 44px, and control rows wrap instead of overflowing.
- **Mobile-friendly modal**: dvh-capped panel that scrolls internally between a sticky
  case header (large close button, never under a banner) and a sticky action footer
  (`[ SOURCE TRAIL ]`); background scroll is position-locked while open and the exact
  scroll offset is restored on close.
- **Mobile menu** opens above the fixed banners (z-index raised while expanded) and
  scrolls internally when taller than the viewport.
- **Battery-aware canvases**: both the hero and the IceCube neutrino canvas pause their
  `requestAnimationFrame` loops via `IntersectionObserver` when offscreen; the neutrino
  schematic now scales to its container width at the device pixel ratio (capped at 2)
  so it stays crisp on retina phones.

### GODMODE pass (v3) — mobile-native UX

- **Bottom command bar** (phones only, `< md`): a fixed thumb-zone "field-device control
  strip" with five ≥48 px targets — **BRIEF / LEDGER / GENEALOGY / DEEP TIME / MORE** —
  each a crisp inline-SVG line icon over a mono micro-label. The active section is lit
  cyan with `aria-current`, synced to scroll position by the same `IntersectionObserver`
  that drives the desktop side ticks. **MORE** opens a small sheet listing the remaining
  sections (Expeditions, Instruments, Open Leads, Sources) with `aria-expanded`; it
  closes on selection, Escape (focus returns to the button), outside tap, or scroll-hide.
  The bar **auto-hides on scroll-down and returns on scroll-up** like a native app.
  *Stacking decision:* the bottom classification banner keeps the true page edge
  (`bottom: 0`, as on a real dossier) and the command bar docks directly **on top of
  it**; both share the same auto-hide trigger so they move as one bottom-chrome unit and
  can never overlap each other, and `body` padding reserves room for **both**, so the
  footer is never covered. Safe-area insets are respected (the banner pads the home
  indicator, keeping the bar's targets clear of the iOS swipe zone). Hidden at `md+`
  and in print; fully keyboard operable.
- **PWA / add-to-home-screen polish**: `apple-mobile-web-app-capable`,
  `black-translucent` status bar, `mobile-web-app-capable`, a reticle/crosshair
  **app icon as an inline `data:` SVG** (favicon + `apple-touch-icon`), and a minimal
  **web-app manifest embedded as a `data:application/manifest+json` URI**
  (name *Antarctica Truth*, `display: standalone`, theme/background `#05080D`). The
  page remains one self-contained file — no external assets. (The manifest deliberately
  omits an icon array: iOS uses the `apple-touch-icon`, and nesting a double-encoded
  `data:` icon inside a `data:` manifest is brittle for no practical gain.)
- **Touch ergonomics**: `-webkit-tap-highlight-color: transparent` plus custom
  `:active` press feedback (bracketed buttons invert and scale 3 %, list rows tint
  cyan), momentum scrolling on every internal scroll container, and no hover-only
  affordances anywhere (the redaction toggle buttons already cover the ledger).
- **Collapsible dense annexes**: Deep Time (4 subsections), Instrument Testimony
  (4 logs), Open Leads, and all 4 Source Register columns use **native
  `<details>/<summary>`** styled as mono dossier tab headers with `[ + ] / [ − ]`
  chevrons. All are **authored `open`** (crawlers, no-JS readers, and print always see
  full content); JS collapses them once **on small screens only** and force-opens them
  at `md+`, where the tab summaries are hidden (or rendered inert for the source
  columns whose summaries contain the real headings) — **desktop layout is unchanged**.
  A `beforeprint` handler opens every disclosure and `afterprint` restores it. A
  capture-phase `toggle` listener pings `resize` so the IceCube canvas re-measures when
  its log is opened.
- **Performance**: the scroll handler is passive **and rAF-throttled** with batched
  reads/writes; canvases stay `IntersectionObserver`-gated with DPR capped at 2; the
  dev console note is deferred to `requestIdleCallback`.

### GODMODE pass (v3) — MILSPEC maximalism

- **Boot sequence** (first visit per session, `sessionStorage`-gated): a < 1.6 s
  teletype overlay — `ESTABLISHING SECURE LINK … / DECRYPTING CASE FILE AT-P/1938-47 …
  / CLEARANCE: PUBLIC // FOR RELEASE / ACCESS GRANTED` — with a visible **[ SKIP ]**
  button (Escape also skips). The real page is in the DOM underneath the whole time:
  the overlay ships `hidden` and a tiny pre-paint inline script unhides it **only**
  when JS is on, motion is allowed, and it hasn't run this session. On dismissal the
  node is **removed from the DOM** — nothing can trap focus or block scroll. Entirely
  skipped under `prefers-reduced-motion`. No audio.
- **Persistent HUD status readout**, integrated into the existing top classification
  banner (zero extra vertical space): live **SECTOR** name, `90°00′00″S`, `REV 02`,
  and a **PAGE n/N** scroll-progress counter, all driven by the shared section
  observer; the bottom banner's page number updates too. Compact on phones (coords/REV
  drop out, the sector ellipsizes; below 390 px the bottom banner drops its lead phrase
  so the case number + page always fit). Decorative telemetry is `aria-hidden`; the
  banner keeps its accessible classification label.
- **Portion marks**: subtle low-opacity mono `(U)` marks prefix every section kicker
  plus the mission statement and executive summary, as on real declassified releases.
- **Record-side ink stamps**: small cyan double-ruled stamps with the same
  imperfect-ink mask as the hero stamp — **VERIFIED** on each expedition exhibit,
  **CROSS-REFERENCED** and **PROVENANCE LOGGED** in the case-file modal. Exhibit stamps
  sit inside `overflow-hidden` banners; modal stamps are in normal flow — contained at
  every viewport width by construction.
- **Header furniture**: registration crop marks now **draw in once on reveal**
  (keyframe-based, so the hover-extend behavior is untouched), section header rules get
  faint mono `+` registration crosses at both ends, one very faint **radar sweep**
  turns behind the Instrument Testimony section (removed under reduced motion / print),
  and the footer closes with a **CSS barcode + coordinate machine-line** flourish.
- **Ethically flagged actors**: the Zündel and Serrano genealogy nodes now carry a
  stark **`CAUTION // ETHICALLY FLAGGED ACTOR`** panel — amber hazard-chevron strip,
  bold mono heading, and the documented context (neo-Nazi activism / Holocaust-denial
  function) always visible, no longer tucked inside the disclosure — plus a compact
  inline `CAUTION // FLAGGED` badge beside the title. The footer's ethical note gains
  the same chevron strip. Grave and clear, never flippant.

---

## Accessibility & performance already implemented

**Accessibility**
- Semantic landmarks (`<nav>`, `<main>`, `<header>`, `<footer>`, `<section>`, `<article>`).
- Skip-to-content link; visible `:focus-visible` rings throughout.
- ARIA: dialog semantics on the modal, `aria-sort` on sortable headers, `aria-expanded`
  on the mobile menu, `aria-live` on the result/count regions, labelled controls, and
  `aria-label`/`role="img"` on decorative and informative SVG/Canvas.
- Keyboard support: table rows AND mobile cards open with Enter/Space; modal closes with
  Escape / backdrop; focus is returned to the triggering element on close. Redaction bars
  lift on keyboard focus as well as hover, and the redacted text is never hidden from
  assistive tech.
- Touch accessibility: redaction bars are real toggle buttons (>= 44px hit area,
  `aria-pressed`, descriptive label) so the reveal works without hover; all interactive
  controls meet the 44x44px minimum touch-target size; opening a case file is a separate,
  explicit affordance from lifting a redaction.
- High-contrast (AA+) cyan/amber accents on near-black ink; dark-only by design;
  `prefers-reduced-motion` honored throughout (including the scanline overlay, the
  banner auto-hide transition, and both canvas animations).

**Performance**
- Zero runtime dependencies beyond the Tailwind CDN; no images to download.
- `IntersectionObserver` (not scroll handlers) for reveals; passive scroll listener for
  the progress bar and the mobile banner auto-hide; canvases cap `devicePixelRatio` at 2
  and reveal-once/unobserve.
- Both canvas animations pause automatically when scrolled offscreen
  (`IntersectionObserver`-gated `requestAnimationFrame`) — a meaningful battery saving
  on phones — and render a single static frame under `prefers-reduced-motion`.
- Content rendered from small in-memory arrays — instant filter/sort/search on both the
  desktop table and the mobile card ledger.

> **Production note:** the Tailwind Play CDN is intended for prototyping. For a real
> deployment, install Tailwind as a build dependency and ship a purged, minified stylesheet
> (see below) so you are not compiling CSS in the browser.

---

## Expanding into a proper Next.js or Astro project

The site is intentionally structured so the migration is mostly mechanical.

### Astro (recommended for a content-first research site)
1. `npm create astro@latest antarctica-truth` and choose a minimal template.
2. `npx astro add tailwind` — move the `tailwind.config` palette from `index.html` into
   `tailwind.config.mjs`.
3. Split the page into components under `src/components/`:
   `Nav.astro`, `Hero.astro`, `MythLedger.astro`, `Genealogy.astro`, `Expeditions.astro`,
   `DeepTime.astro`, `IceTestifies.astro`, `Sources.astro`, `Footer.astro`.
4. Move `MYTH_RECORDS` and `GENEALOGY` into `src/data/*.json` (or content collections with
   a Zod schema) and import them. Keep the small vanilla-JS interactions as island scripts
   or a tiny client component.
5. Static-generate; add an RSS feed for "dossier updates."

### Next.js (recommended if you want dynamic features/APIs)
1. `npx create-next-app@latest --ts --tailwind`.
2. Port the palette into `tailwind.config.ts`; drop the Play CDN `<script>`.
3. Recreate sections as React components; move the data arrays into `lib/data.ts` typed with
   TypeScript interfaces (`MythRecord`, `GenealogyNode`).
4. Reimplement the modal/table/timeline logic with React state + hooks (or keep them as
   framework-light components). Consider a small headless table lib only if the dataset grows.
5. Add API routes for a newsletter signup or a submissions endpoint (see next-features).

---

## Recommended real image / data sources (swap-in)

Each is marked in `index.html` with an HTML comment at the point of use. Always credit.

- **NASA** — Operation IceBridge aerial imagery, BedMachine Antarctica visualizations,
  Earth Observatory. (Credit: *NASA*; most NASA imagery is public domain.)
- **USGS** — Antarctic geology and mapping.
- **British Antarctic Survey (BAS)** — landscape photography, Bedmap datasets, fossil imagery.
  (Credit per BAS terms.)
- **Polar Geospatial Center (PGC)** — REMA (Reference Elevation Model of Antarctica).
- **IceCube / NSF** — detector diagrams and photos. (Credit: *IceCube Collaboration/NSF*.)
- **Unsplash** — freely licensed Antarctic photography (e.g., Derek Oyen, Cassie Matias) for
  hero/backgrounds when a specific scientific image isn't needed.
- **Paleogeographic reconstructions** — Ron Blakey / Colorado Plateau Geosystems or PALEOMAP
  for the Gondwana-breakup figure (check licensing/permission).

When swapping in raster images, keep them responsive (`max-width:100%`), provide descriptive
`alt` text, and serve modern formats (AVIF/WebP) with width-appropriate `srcset`.

---

## Suggested next features

- **Interactive map** with Leaflet (or MapLibre GL) showing expedition routes, station
  locations (Neumayer I/II, Amundsen–Scott, Vostok), and subglacial-lake positions.
- **PDF generation** of the claim ledger and a printable dossier (e.g., server-side with
  Puppeteer, or client-side with `pdf-lib` / the browser print pipeline already wired up).
- **Newsletter signup** for dossier revisions (Next.js API route + a provider like Buttondown).
- **Submissions workflow** so researchers can propose citation corrections (PR-based or a
  lightweight form → issue).
- **Full-text search** across sources (e.g., Pagefind for a static build).
- **Localization** (i18n) — the source-critical method travels well across languages.
- **Deep-time scrollytelling** — a scroll-driven paleogeography animation for the Gondwana
  breakup, and a bed-elevation cross-section slider.

---

## Content discipline

Every myth element in `MYTH_RECORDS` / `GENEALOGY` carries a **first-appearance year and
author**. This is the core method: claims are dated to their origin (Szabo 1947, Bernard
1964, Zündel 1970s, Serrano 1978–84), never presented as plausible. Where key myth-makers
(Zündel, Serrano) are named, their documented neo-Nazi activism and the legend's historical
function as soft-entry mythology for Holocaust denial are noted explicitly.

Deep-time content uses established scientific consensus only. When updating figures, cite the
dataset/paper (BedMachine, Bedmap, REMA, IceBridge, van Wyk de Vries et al. 2017, etc.).

Content is consistent with the *Antarctica Truth Research Dossier — Second Edition, July 2026*.

---

## License / attribution

Site code is original for this project. Replace placeholder art with properly credited media
before public deployment. Verify all bibliographic editions and page references against the
original documents.
