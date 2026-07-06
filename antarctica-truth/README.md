# The Antarctica Truth Project — Website

A single, self-contained `index.html` — a source-critical research site that separates
**documented history** from **constructed mythology** about 20th-century Antarctica, and
reveals the continent's real **deep-time** history (170+ million years before humans).

Built with **Tailwind CSS 3.4+ (Play CDN)** and **vanilla JavaScript** — no frameworks, no
build step, no external assets. Open `index.html` in any modern browser and it works offline.

---

## What's inside

| Section | Feature |
|---|---|
| Sticky nav | Anchored links, "Last Updated: July 2026" badge, mobile menu, scroll styling |
| Hero | Full-bleed glacial gradient, dual CTAs, reduced-motion aware |
| Executive Summary | Verbatim mission statement + four-pillar overview + stat band |
| **Myth vs Record** | Filterable / searchable / **sortable** table; click any row → modal with quotes + **"Source Trail"**; CSV export; print one-pager |
| **Myth Detector** | Pick a claim → instant first-appearance date + author |
| **Genealogy timeline** | 1938–present vertical timeline; click a node → sourced excerpt + downstream effect; ideological-context flags on Zündel/Serrano |
| Real Expeditions | Neuschwabenland 1938–39, Ahnenerbe Tibet 1938–39, Operation Highjump 1946–47 — key facts + "what did not happen" |
| **Deep Time** | Gondwana breakup, Eocene forests & dinosaurs, ice onset ~34 Ma, Gamburtsev range, ~400 subglacial lakes, 91+ volcanoes, IceBridge/BedMachine/REMA |
| The Ice Testifies | Clean Air Sector, IceCube rebuttal to hollow-Earth, ANITA, buried Neumayer stations, **Canvas neutrino animation** |
| Open Leads | Research threads + citizen-science calls to action |
| Sources | Categorised bibliography + how to access primary documents |
| Footer | Ethical note on the legend's historical function |

Plus: right-side **section progress dots**, scroll-reveal animations, a **print stylesheet**
tuned for the table + timeline, and full keyboard/ARIA accessibility.

---

## Content sourcing

Every historical and source-critical claim is drawn from the *Antarctica Truth Research
Dossier (Second Edition, July 2026)*. The deep-time section follows published scientific
consensus (Gondwana, Eocene fossils, Eocene–Oligocene glaciation onset, Gamburtsev
Subglacial Mountains, subglacial lakes/Lake Vostok, the 2017 91-volcano survey, and airborne
radar mapping). Nothing is invented or exaggerated.

The site names the documented neo-Nazi activism of Ernst Zündel and Miguel Serrano and the
legend's function as soft-entry mythology for Holocaust denial — this is treated as an ethical
requirement, not an aside.

---

## Expanding into a proper project

### Next.js (App Router)
1. `npx create-next-app@latest antarctica-truth --ts --tailwind --app`
2. Split the single file into components: `Nav`, `Hero`, `ExecutiveSummary`, `MythTable`,
   `Timeline`, `Expeditions`, `DeepTime`, `IceTestifies`, `Sources`, `Footer`, `Modal`.
3. Move `MYTHS[]` and `TIMELINE[]` into `data/` as typed JSON/TS modules (great candidates for
   MDX or a headless CMS later).
4. Replace the Play CDN with the installed Tailwind pipeline (`tailwind.config.ts` already has
   the `navy`/`ice`/`frost` tokens — copy them across).
5. Port the neutrino Canvas into a `useEffect` client component; keep the reduced-motion guard.

### Astro (recommended for a content-first, mostly-static site)
1. `npm create astro@latest` + `npx astro add tailwind`.
2. Each section becomes an `.astro` component; the table/timeline/detector stay as small
   client islands (`client:visible`) so the page ships almost no JS by default.
3. Author claims as content collections (Markdown/MDX) with schema validation via `zod`.

---

## Recommended real image sources

Swap the CSS gradients / SVGs for real imagery. Suggested, license-friendly sources:

- **NASA** — Operation IceBridge aerials, BedMachine renders, Landsat Image Mosaic of
  Antarctica (LIMA, public domain), Earth Observatory.
- **USGS** — Antarctic topographic and satellite datasets.
- **British Antarctic Survey (BAS)** — expedition and field photography (check licensing).
- **Polar Geospatial Center** — REMA surface model visualisations.
- **IceCube Collaboration** — detector renders and neutrino-event graphics (credit the
  collaboration).
- **IODP** — Expedition 369 ("Antarctic rainforest") core imagery.
- **Unsplash** — high-quality Antarctic landscape photography (credit the photographer).

Inline `<!-- IMAGE CREDIT -->` comments in `index.html` mark exactly where to drop each asset.

---

## Suggested next features

- **Interactive map** (Leaflet or MapLibre) of Neuschwabenland vs Highjump operating areas,
  and subglacial features (Gamburtsevs, Lake Vostok) over a BedMachine basemap.
- **Full-dossier PDF generation** (server-side via Puppeteer, or client-side via `pdf-lib`).
- **Newsletter signup** and a lightweight submissions form for the "How to help" section.
- **Deep-linkable claims** — give each `MYTHS[]` row a URL hash so a specific source trail can
  be shared.
- **i18n** — the myth is multilingual; translated source apparatus would be high-value.
- **Data layer** — load `MYTHS`/`TIMELINE` from a CMS so educators can extend the record.

---

## Accessibility & performance (already implemented)

**Accessibility**
- Semantic landmarks (`nav`, `main`, `section`, `footer`, `article`), a skip link, and an
  ARIA-labelled dialog with focus trap, ESC-to-close, and focus restoration.
- Keyboard-operable table rows (`role="button"`, Enter/Space), sortable headers, and visible
  `:focus-visible` rings on every control.
- `aria-live` regions for the Myth Detector result; descriptive labels on the Canvas.
- Colour contrast tuned for the dark palette; respects `prefers-reduced-motion` (animations,
  smooth scroll, and the neutrino Canvas all degrade gracefully).

**Performance**
- Zero runtime dependencies beyond the Tailwind CDN and two web fonts (preconnected,
  `display=swap`).
- Scroll effects use a single `IntersectionObserver`; the Canvas animation is `requestAnimationFrame`
  based and pausable, and never runs when reduced-motion is requested.
- All imagery is CSS/SVG by default, so the initial payload is tiny and the page is offline-capable.
- Passive scroll listeners; no layout-thrashing.

> **Production note:** the Tailwind Play CDN compiles styles in the browser (great for a
> single file, not ideal for production). Install Tailwind as a build step before shipping at
> scale — see "Expanding into a proper project" above.

---

*© 2026 The Antarctica Truth Project. Educational and non-commercial use encouraged, with citation.*
