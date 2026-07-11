# Barone Law Offices — Marketing Website

A single-page marketing site for **Barone Law Offices**, the criminal defense
practice of Attorney Ted Barone in Brockton, Massachusetts. Built with
**Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, and
**framer-motion**, with a navy/gold/charcoal brand system and a
content-as-config architecture: every word of copy lives in one file.

> *"You're Not Alone When You Got Barone!"*

## Features

- Single-page App Router site: Hero, About, The Barone Difference, Practice
  Areas, Our Commitment, Results & Trust, Consultation CTA, Contact, Footer
- All copy, contact details, practice areas, and results sourced from a single
  typed config (`src/lib/site-config.ts`) — no hardcoded content in components
- Contact form with an API route that emails via Resend when configured, and
  degrades gracefully (logs submissions) when it is not
- SEO: full metadata + Open Graph/Twitter cards, `sitemap.xml`, `robots.txt`,
  and JSON-LD structured data (`LegalService`/`Attorney` + `Person`)
- Brand typography via `next/font` (Playfair Display + Inter), smooth-scroll
  section navigation, framer-motion reveal animations
- Styled image placeholders for every visual slot, with ready-to-use
  Grok Imagine prompts for final assets
- Attorney-advertising disclaimer and compliance-minded copy throughout

## Tech stack

| Layer      | Choice                                        |
| ---------- | --------------------------------------------- |
| Framework  | Next.js 15 (App Router, React 19)             |
| Language   | TypeScript (strict)                           |
| Styling    | Tailwind CSS 3 with custom brand utilities    |
| Animation  | framer-motion                                 |
| Icons      | lucide-react                                  |
| Fonts      | Playfair Display (serif) + Inter (sans) via `next/font` |
| Email      | Resend (optional, for the contact form)       |

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production build:

```bash
npm run build
npm start
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in as needed:

| Variable                            | Purpose                                                        |
| ----------------------------------- | -------------------------------------------------------------- |
| `RESEND_API_KEY`                    | Resend API key used by the contact form API route              |
| `CONTACT_TO_EMAIL`                  | Inbox that receives contact-form submissions                   |
| `CONTACT_FROM_EMAIL`                | Verified sender address for outgoing form emails               |
| `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL` | Optional Maps embed URL (a keyless embed is used by default)   |

**With** the email variables set, the contact form delivers submissions to
`CONTACT_TO_EMAIL` via Resend. **Without** them, the API route logs the
submission server-side and still returns success, so the form remains fully
usable in development.

## Project structure

```
barone-law-offices/
├── public/
│   └── images/            # Visual assets (see public/images/README.md)
├── src/
│   ├── app/
│   │   ├── layout.tsx     # Fonts, metadata, viewport, structured data
│   │   ├── page.tsx       # Section composition for the one-page site
│   │   ├── globals.css    # Palette, base styles, smooth scroll
│   │   ├── sitemap.ts     # sitemap.xml
│   │   ├── robots.ts      # robots.txt
│   │   └── api/contact/   # Contact form endpoint
│   ├── components/        # Page sections (hero, about, contact, ...)
│   │   └── ui/            # Reusable primitives (button, input, card, ...)
│   └── lib/
│       ├── site-config.ts # ALL site content — single source of truth
│       └── utils.ts       # cn() class helper
├── GROK_IMAGINE_PROMPTS.md
└── README.md
```

## Editing content

Everything the site says — firm name, tagline, phone numbers, address,
practice areas, difference points, results, disclaimer — lives in
**`src/lib/site-config.ts`**. Edit that file and every section updates.
Do not hardcode copy inside components.

## Adding images

The site ships with styled placeholders in every image slot. To replace them:

1. Generate assets with the prompts in
   [`GROK_IMAGINE_PROMPTS.md`](./GROK_IMAGINE_PROMPTS.md).
2. Save them into `public/images/` using the exact filenames listed in
   [`public/images/README.md`](./public/images/README.md).
3. Swap each placeholder `<div>` (marked with a
   `GROK IMAGINE IMAGE SLOT [slot-id]` comment) for a Next.js `<Image>` as
   shown in the prompts document.

## Deployment (Vercel)

1. Push the repository to GitHub.
2. Import the project into [Vercel](https://vercel.com) — Next.js is detected
   automatically, no custom build settings needed.
3. Add the environment variables from `.env.example` in the Vercel project
   settings (Production and Preview).
4. Deploy. Point `www.baronelaw.com` at the project when ready; the metadata,
   sitemap, and structured data already use that canonical URL.

## Attorney advertising & compliance

This website is **attorney advertising**. Its content is for general
informational purposes only, does not constitute legal advice, and does not
create an attorney-client relationship. **Prior results do not guarantee a
similar outcome** — case results shown are illustrative of past matters, and
every case must be judged on its own facts. Before publishing changes, review
copy and imagery against Massachusetts Rules of Professional Conduct 7.1–7.5
(no misleading statements, no implied guarantees of outcome), and keep the
site-wide disclaimer in `src/lib/site-config.ts` intact.
