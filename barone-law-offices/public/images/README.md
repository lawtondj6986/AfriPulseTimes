# Image Assets — Barone Law Offices

This folder holds the site's visual assets, generated with **Grok Imagine**
(prompts live in [`GROK_IMAGINE_PROMPTS.md`](../../GROK_IMAGINE_PROMPTS.md) at
the project root). Drop generated files directly into this folder using the
**exact filenames** below — each filename maps to a specific slot in the site.

## Required filenames

| Filename                 | Slot / Section                    | Recommended dimensions |
| ------------------------ | --------------------------------- | ---------------------- |
| `hero-background.jpg`    | Hero — full-bleed background      | 1920 × 1080 (16:9)     |
| `hero-video.mp4`         | Hero — optional looping video bg  | 1920 × 1080, 6–10 s    |
| `ted-headshot.jpg`       | About — attorney portrait         | 1200 × 1500 (4:5)      |
| `consultation-scene.jpg` | Commitment — consultation photo   | 1500 × 1000 (3:2)      |
| `courtroom.jpg`          | Results — courtroom photo         | 1600 × 900 (16:9)      |
| `cta-background.jpg`     | Consultation CTA — band bg        | 1920 × 800 (12:5)      |
| `og-image.jpg`           | Social sharing (Open Graph)       | 1200 × 630             |

`hero-video.mp4` is optional; if present it can replace the static hero image
with a slow, subtle motion loop (keep it muted and under ~5 MB).

## Placeholders

Until a file is added, the matching component renders a **styled placeholder**
in its slot (a branded navy/gold block), so the site looks complete during
development. Each placeholder is marked in the component source with a
`GROK IMAGINE IMAGE SLOT [slot-id]` comment. Once you save an asset here with
the correct filename, follow the swap instructions in
`GROK_IMAGINE_PROMPTS.md` to replace the placeholder with a Next.js `<Image>`
(or `<video>` for the hero loop).
