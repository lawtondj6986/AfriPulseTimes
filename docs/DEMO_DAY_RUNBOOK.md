# AfriPulse Times — Demo Day Runbook

_Everything you need to run a flawless live demo. Print this or keep it open on a
second device. Pitch dates: **July 4 & July 6, 2026.**_

Live site: **https://afri-pulse-times.vercel.app/afripulse-preview.html**

---

## ✅ T‑minus 30 minutes (pre‑flight)

Do these in order, then **don't touch the site again** until you present.

1. **Open the site** in the browser you'll present with. Use an **incognito/private
   window** (guarantees the newest version, no stale cache).
2. **Log into admin** → the site → `#/admin` → magic-link email → click the link.
3. **Pull live wire** — in the top bar, click **"Pull live wire ↻"**. Wait for it
   to say it pulled/refreshed. Fresh headlines now carry real source photos.
   _(Optional, if `ANTHROPIC_API_KEY` is set + the polish migration is run: go to
   Admin → Articles → **✦ Polish wire** so sourced stories read as clean AfriPulse
   briefs instead of choppy feed snippets. Click again to polish more.)_
4. **Upload great photos to your 3–5 marquee stories** — the exact ones you'll
   open on stage. Admin → open the story → **Upload image** → pick a strong photo →
   Save. (This is the difference between "fine" and "wow" on the screen.)
5. **Submit one test enquiry** through the investor form (use your own email) so
   you know the form + email alert are working, and so you have a row to show in
   the **Enquiries** tab.
6. **Open your Traction dashboard** → admin → **Dashboard** tab (or `#/admin/metrics`).
   Confirm the numbers load. Leave it open in its own tab so you can flip to it
   instantly. _(One-time: for the **Pageviews** tile to fill, run
   `supabase/migrations/20260703120000_article_views.sql` in Supabase → SQL Editor.
   Everything else on the dashboard works without it.)_
7. **Open the media kit** at `#/advertise` in its own tab and glance over it, so
   you can flip to it instantly when you hit the revenue beat.
8. **Set language back to EN**, scroll to the top, and leave the **home page**
   loaded in a tab, ready to go.
9. **Start your backup screen recording** (see below) if you haven't already.

> ⚠️ **Do NOT click "⟲ Reset"** in the top bar during the demo — it wipes the site
> back to seed data. It's a maintenance tool, not a demo control.

---

## 🎬 The 2‑minute live demo (say this, click that)

Keep it to ~2 minutes. Narrate the *story*, not the features.

1. **Home page.** _"This is AfriPulse Times — one masthead for 54 African nations,
   updating in real time."_ Point to the **live story count**, the photo-rich
   grid, and the **live FX ticker** (real African currency rates, marked LIVE).
2. **Switch language: EN → Français → العربية.** _"The entire product is in five
   languages — English, French, Arabic, Swahili, Portuguese — and our AI
   translation layer carries each story across all of them. The continent, in its
   own languages."_
3. **Open a marquee story** (one you uploaded a photo to). _"Every story is a real
   record in our database — filed by bureau, tagged by country and topic."_ As you
   scroll, point at the **native ad unit** woven into the story: _"and notice how
   an ad looks here — part of the story, brand-safe, not spam."_
4. **Click "Advertise" (the revenue beat).** Open `#/advertise`. _"Here's how it
   pays for itself — and here's our real edge. We don't just sell banners; we sell
   a **language** or a **region**. A pan-African brand can't buy 'all of Africa, in
   five languages, on one premium surface' anywhere else. That's us."_ Point at the
   signature packages (Continental Anchor, Coverage-Map Sponsor, Language & Region).
5. **Search a country** (e.g. "Nigeria"). _"Full-text search across every vertical,
   instantly."_
6. **Scroll to the Series Seed section → submit the enquiry form.** _"And this is
   live — your interest just landed in our database, and pinged our inbox."_
   (Optional flourish: open **admin → Enquiries** and show the row appear.)
7. **Flip to the Traction dashboard** (admin → **Dashboard**). _"And this is our
   newsroom command center — every number here is live from production: stories
   published, nations covered, subscribers, enquiries, page views, our wire
   sources, translation coverage."_ Let the KPIs count up; point at the live pulse.
   **This is your "we can operate and measure this" moment — investors love a real
   dashboard.**

**Close:** _"A production newsroom — five languages, AI-assisted, real-time,
measured, with a real advertising model built in — running on infrastructure that
costs us cents a day and scales to the whole continent. We're raising our Series
Seed to turn this into the continent's newsroom."_

### If you have 3–4 minutes, add:
- **Admin desk:** publish a story live and watch it appear on the site.
- **Live wire:** click **Pull live wire** and show fresh headlines flow in.

---

## 🛟 Backup plan (do this — it removes your biggest risk)

- **Record a 60–90s screen capture** of the full click-path above, *before* the
  pitch. If wifi/an API hiccups on stage, play the video and keep narrating. A
  network blip can't sink you.
- **Phone hotspot** ready as a network fallback.
- **Two or three screenshots** (home, an article with a photo, admin Enquiries) on
  your phone as a last-resort static backup.

---

## 🧯 If something goes wrong on stage

| Symptom | Do this |
|---|---|
| Page won't load / looks old | You prepped in incognito, so switch to the **backup recording** and keep talking. |
| No photos on some cards | Expected on a few — the topical fallback + branded tiles are by design. Open one of your **uploaded** marquee stories instead. |
| Admin login won't work | Don't debug live — show the **backup recording** of the admin flow. |
| Form shows an error | Say _"we capture these to our database"_ and move on; don't dwell. |
| Anything freezes | Cut to the recording. Never debug in front of investors. |

---

## 💬 Q&A cheat sheet (have crisp, honest answers)

- **Traction?** _"Live proof-of-concept; the raise funds real editorial and growth."_
  (Add any real numbers you have.)
- **How do you make money?** _"Advertising is the lead line — and it's already
  built: a media kit and real placements are live at /advertise. Our edge is that
  we sell by **language and region** — one premium, brand-safe surface no
  pan-African brand can buy anywhere else — plus membership, syndication, and
  first-party advertiser insights."_
- **Why you?** _"I'm not a career engineer — I cared enough about putting the
  continent's story in its own hands that I shipped a live product myself."_
- **Competition / moat?** _"Incumbents are single-country or single-language, or
  foreign-owned. Our moat is pan-African aggregation + five-language AI + brand —
  and an ad model that monetises the same audience by language and region."_
- **Team?** _"Solo today; first hires with funding are an editorial lead and an engineer."_
- **Tech scale?** _"MVP architecture; the first funded engineering work is
  server-rendering and per-article URLs. The codebase is tested and documented."_
- **Content rights?** _"Aggregation today, moving to original reporting as we fund
  editorial."_

---

## 🔎 The morning of — 60‑second sanity check

- [ ] Site loads in an incognito window (newest version)
- [ ] Admin login works
- [ ] Pull live wire done → fresh photos showing
- [ ] Marquee stories have uploaded photos
- [ ] Test enquiry submitted + email received
- [ ] Language switch works (EN/FR/AR/SW/PT)
- [ ] Media kit opens at `#/advertise`; native ad unit shows inside a story
- [ ] Backup recording saved and playable offline
- [ ] Hotspot ready

Breathe. You built a real thing. Go tell its story. 🌍
