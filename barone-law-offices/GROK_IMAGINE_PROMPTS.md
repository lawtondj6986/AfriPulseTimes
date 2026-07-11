# Grok Imagine Prompts — Barone Law Offices Visual Assets

Every image slot on the site has a matching prompt below. Generate each asset
with Grok Imagine at the listed dimensions, save it into `public/images/` with
the exact target filename, and swap it into its component (instructions at the
bottom).

**Aesthetic guardrails for every prompt:** photorealistic, dignified, premium
law-firm quality. Navy, gold, and charcoal tones where relevant. No text
overlays, no watermarks, no handcuffs-and-gavel clichés, no sensationalism.
Imagery should convey experience, calm authority, and respect for clients.

---

## 1. `hero-background`

- **Appears in:** Hero section — full-bleed background behind the headline and tagline
- **Aspect ratio / dimensions:** 16:9 — 1920 × 1080
- **Target filename:** `public/images/hero-background.jpg`

> **Prompt:** Photorealistic cinematic photograph of a distinguished male
> attorney in his late 60s to early 70s wearing an impeccably tailored navy
> suit, standing confidently in a grand marble courthouse corridor. Tall
> columns and warm stone recede into soft focus behind him. Soft directional
> window light rakes across the marble, shallow depth of field, serious yet
> approachable expression. Muted navy, charcoal, and warm gold tones. Premium
> editorial law-firm photography, no text, no logos.

## 2. `hero-video` (optional)

- **Appears in:** Hero section — optional looping video background replacing the static image
- **Aspect ratio / dimensions:** 16:9 — 1920 × 1080, 6–10 second seamless loop, muted
- **Target filename:** `public/images/hero-video.mp4`

> **Prompt:** Slow, subtle cinematic motion version of the hero scene: a slow
> push-in down a grand marble courthouse corridor at golden hour, dust motes
> drifting through shafts of soft directional light, tall columns in shallow
> depth of field, muted navy and warm gold palette. Nearly imperceptible camera
> movement, dignified and calm, seamless 6–10 second loop, no people required,
> no text.

## 3. `ted-headshot`

- **Appears in:** About section — attorney portrait beside the biography
- **Aspect ratio / dimensions:** 4:5 — approximately 1200 × 1500
- **Target filename:** `public/images/ted-headshot.jpg`

> **Prompt:** Warm professional studio headshot of an experienced
> Italian-American male criminal defense attorney, approximately 70 years old,
> with well-groomed silver hair, wearing a navy suit, white shirt, and
> understated tie. Confident but compassionate expression, gentle smile, direct
> eye contact. Dark neutral charcoal backdrop, soft key light with subtle rim
> light, premium corporate portrait photography, tack-sharp eyes, no text.

## 4. `consultation-scene`

- **Appears in:** Commitment section — supporting photograph for the client-care copy
- **Aspect ratio / dimensions:** 3:2 — approximately 1500 × 1000
- **Target filename:** `public/images/consultation-scene.jpg`

> **Prompt:** Photorealistic warm photograph of a private legal consultation:
> a senior attorney in a navy suit attentively listening to a client across a
> handsome wooden desk in a book-lined law office. Soft natural window light,
> leather-bound volumes and warm wood tones in the background, supportive and
> respectful mood. Faces softly angled or in shallow focus so they need not be
> identifiable. Calm, confidential, reassuring atmosphere, no text.

## 5. `courtroom`

- **Appears in:** Results & Trust section — background/inset photograph
- **Aspect ratio / dimensions:** 16:9 — approximately 1600 × 900
- **Target filename:** `public/images/courtroom.jpg`

> **Prompt:** Dignified photorealistic photograph of an empty, stately American
> courtroom: polished dark-wood counsel tables, judge's bench, and jury box lit
> by soft morning light through tall windows. Alternatively, a lone attorney in
> a navy suit standing composed at the counsel table, seen from behind at a
> respectful distance. Quiet, solemn, never sensational. Rich wood, navy, and
> muted gold tones, architectural photography quality, no text.

## 6. `cta-background` (optional)

- **Appears in:** Consultation CTA band — heavily darkened background behind the call-to-action
- **Aspect ratio / dimensions:** 12:5 — 1920 × 800
- **Target filename:** `public/images/cta-background.jpg`

> **Prompt:** Moody abstract photograph in deep navy tones: the silhouette of
> scales of justice against dark veined marble texture, dramatic low-key
> lighting with a faint warm gold glow along one edge. Heavily darkened
> overall, high negative space, designed as a background for light text
> overlay. Elegant, restrained, premium, no text, no logos.

## 7. `og-image`

- **Appears in:** Social sharing preview (Open Graph / Twitter card)
- **Aspect ratio / dimensions:** 1200 × 630
- **Target filename:** `public/images/og-image.jpg`

> **Prompt:** Premium wide composition for a law-firm brand lockup: dark navy
> marble surface with subtle gold veining, soft directional light from the
> upper left creating a gentle gradient, generous empty space in the center and
> left two-thirds where a firm name and logo will be placed later. A faint,
> tasteful scales-of-justice silhouette in the lower right, deeply shadowed.
> Imagery only — generate no text or lettering of any kind; typography is added
> in post.

---

## How to swap in your assets

1. **Generate** each image with Grok Imagine at the dimensions listed for its
   slot (upscale or crop as needed to hit the target size).
2. **Save** the file into `public/images/` with the **exact filename** shown
   above (e.g. `hero-background.jpg`).
3. **Replace the placeholder** in the matching component. Each slot is marked
   with a comment of the form `GROK IMAGINE IMAGE SLOT [slot-id]`. Delete the
   placeholder `<div>` beneath that comment and render a Next.js `<Image>`
   instead (or a `<video>` element for `hero-video`).
4. **Keep descriptive alt text** on every image for accessibility — describe
   what is pictured, not just "photo".

Example swap (in `src/components/about.tsx`, slot `ted-headshot`):

```tsx
import Image from "next/image";

// Before: styled placeholder <div> under the
// {/* GROK IMAGINE IMAGE SLOT [ted-headshot] */} comment.

// After:
<Image
  src="/images/ted-headshot.jpg"
  alt="Attorney Ted Barone, criminal defense attorney in Brockton, Massachusetts"
  fill
  className="object-cover"
/>
```

For the optional hero video:

```tsx
<video
  autoPlay
  muted
  loop
  playsInline
  className="absolute inset-0 h-full w-full object-cover"
  poster="/images/hero-background.jpg"
>
  <source src="/images/hero-video.mp4" type="video/mp4" />
</video>
```

Remember to keep the parent container `relative` (required by `fill`) and to
preserve any overlay/darkening layers that sit above the image for text
legibility.

---

## Compliance reminder

All imagery on this site is attorney advertising. Visuals must remain
dignified and truthful: do not use imagery that implies guaranteed results,
dramatizes outcomes, depicts real clients without consent, or could be
mistaken for a factual case record. Prior results do not guarantee a similar
outcome.
