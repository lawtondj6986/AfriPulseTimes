// AfriPulse Times — per-story share pages (Vercel serverless function).
//
// Problem: the site is a hash-routed SPA, so every shared story link unfurls
// the same generic preview in WhatsApp/Telegram/X — crawlers never execute
// the router. This function gives each story a real URL with its own
// OpenGraph card:
//
//     https://afripulsetimes.com/s/<slug>
//
// Crawlers read per-story meta (headline, standfirst, image), schema.org
// NewsArticle structured data and the full article text; humans are
// redirected instantly to the reader at /#/story/<slug>. Wired by the
// vercel.json rewrite  /s/:slug  →  /api/story-share?slug=:slug.
//
// Env: SUPABASE_URL + SUPABASE_ANON_KEY (or the VITE_* build-time pair).
// The anon key is public by design; RLS only exposes published articles.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SITE_URL = (process.env.SITE_URL || 'https://afripulsetimes.com').replace(/\/$/, '');

const SLUG_RE = /^[a-z0-9-]{1,120}$/;

// ── pure helpers (exported for tests) ─────────────────────────
export function escapeHtml(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

// Wire feeds prefix text with a raw "[DW] " style tag and often repeat the
// summary as the only body paragraph. Strip the tag; never repeat a sentence.
const WIRE_TAG = /^\s*\[([^\]\n]{2,40})\]\s*/;
export function stripWireTag(s){ return String(s == null ? '' : s).replace(WIRE_TAG, ''); }
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\u00c0-\uffff]+/g, ' ').trim();
// Not a summary: styling or markup leaked from a feed, a sponsor line, or the headline again.
// `paragraph` skips the length rule: a short paragraph is still a paragraph.
export function isJunkSummary(text, headline, paragraph){
  const t = String(text || '').trim();
  if (!paragraph && t.length < 12) return true;
  if (/\/\*|\*\/|box-sizing|mso-|!important|\{[^{}]{0,200}:[^{}]{0,200}\}|<\/?[a-z][^>]*>/i.test(t)) return true;
  if (/^(in partnership with|sponsored( content| by)?|advertisement|presented by)\b/i.test(t)) return true;
  return !!headline && norm(t) === norm(headline);
}
const DEFAULT_DESC = 'Real-time, editor-verified news from all 54 African nations.';

// Light, lossless-in-meaning headline hygiene for feed headlines:
//   "👨🏿‍🚀TechCabal Daily – …"                 → no leading emoji
//   "South Africa: South Africa Links to …"   → no doubled prefix
//   "EDITORIAL: Sustaining …"                 → "Editorial: Sustaining …"
//   "… News Briefs - November 23, 2026"       → no trailing date
// Never rewrites the wording of a headline.
const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';
export function tidyHeadline(h){
  let t = String(h == null ? '' : h).replace(/\s+/g, ' ').trim();
  t = t.replace(/^[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\u200d\ufe0f\s]+/u, '');
  const m = /^([^:]{2,40}):\s+(.+)$/.exec(t);
  if (m && m[2].toLowerCase().startsWith(m[1].toLowerCase() + ' ')) t = m[2];
  t = t.replace(/^(EDITORIAL|OPINION|ANALYSIS|BREAKING|EXCLUSIVE|INTERVIEW|EXPLAINER|FACT CHECK)(\s*:)/, (x, w, c) => w.charAt(0) + w.slice(1).toLowerCase() + c);
  t = t.replace(new RegExp('\\s[-–—]\\s(' + MONTHS + ')\\s\\d{1,2},\\s\\d{4}$', 'i'), '');
  return t.trim();
}
// "Makinde: Bride or side-chick?, By Wole Olaoye" → headline + the writer's name.
export function splitByline(h){
  const m = /^(.{10,}?),\s*[Bb]y\s+([A-Z][\w'’.-]+(?:\s+[A-Z][\w'’.-]+){0,3})\s*$/.exec(String(h || ''));
  return m ? { headline: m[1].trim(), by: m[2] } : { headline: String(h || ''), by: '' };
}
// A digest or newsletter rather than a single news story.
export function isRoundup(h){
  return /\b(daily|roundup|round-up|news briefs?|newsletter|briefing|week in review|this week|weekly|digest|live updates?)\b/i.test(String(h || ''));
}

// Normalise a DB row to the fields the card needs (typed columns + payload).
export function articleFromRow(row){
  const p = (row && typeof row.payload === 'object' && row.payload) || {};
  const hb = splitByline(tidyHeadline(row.headline || p.headline));
  return {
    slug: row.slug,
    headline: hb.headline || 'AfriPulse Times',
    description: usableSummary(row, p) || DEFAULT_DESC,
    // Older rows stored attribute-encoded image URLs ("&amp;"); undo that here.
    image: String(row.hero_image || p.hero_image || '').replace(/&(amp|#0*38|#x0*26);/gi, '&') || null,
    published_at: row.published_at || p.publishedAt || null,
    body: bodyParagraphs(row, p),
    byline: hb.by || p.byline || null,
    section: row.vertical || p.vertical || null,
    // Wire items keep their attribution wherever the text travels.
    sourceUrl: (p.source === 'rss' && /^https?:\/\//.test(p.sourceUrl || '')) ? p.sourceUrl : null,
    sourceLabel: p.source === 'rss' ? (p.sourceLabel || null) : null
  };
}

function usableSummary(row, p){
  const d = stripWireTag(p.standfirst || p.dek || row.dek);
  return d && !isJunkSummary(d, row.headline || p.headline) ? d : '';
}

function bodyParagraphs(row, p){
  const raw = Array.isArray(p.body) ? p.body : String(p.body || row.body || '').split(/\n{2,}/);
  const dek = norm(stripWireTag(p.standfirst || p.dek || row.dek));
  const head = row.headline || p.headline;
  return raw.map((x) => stripWireTag(x).trim()).filter((x) => x && norm(x) !== dek && !isJunkSummary(x, head, true)).slice(0, 60);
}

// schema.org NewsArticle — what Google News and other aggregators read.
export function buildJsonLd(article, site){
  const s = site || SITE_URL;
  const url = s + '/s/' + encodeURIComponent(article.slug);
  const publisher = {
    '@type': 'NewsMediaOrganization', name: 'AfriPulse Times', url: s + '/',
    logo: { '@type': 'ImageObject', url: s + '/icons/icon-512.png' }
  };
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    headline: String(article.headline).slice(0, 110),
    description: String(article.description).slice(0, 300),
    image: [pickImage(article, s)],
    inLanguage: 'en',
    isAccessibleForFree: true,
    publisher,
    author: article.sourceLabel
      ? { '@type': 'Organization', name: article.sourceLabel }
      : (article.byline ? { '@type': 'Person', name: article.byline } : publisher)
  };
  if (article.published_at){ ld.datePublished = article.published_at; ld.dateModified = article.published_at; }
  if (article.section) ld.articleSection = article.section;
  if (article.sourceUrl) ld.isBasedOn = article.sourceUrl;
  if (article.body && article.body.length) ld.articleBody = article.body.join('\n\n').slice(0, 20000);
  // Never let article text close the <script> element.
  return JSON.stringify(ld).replace(/</g, '\\u003c');
}

export function pickImage(article, site){
  const img = article.image;
  if (img && /^https:\/\//.test(img)) return img;
  if (img && img.startsWith('/')) return (site || SITE_URL) + img;
  // No photo: a generated card carrying this story's own headline (api/og.js).
  if (article.slug && SLUG_RE.test(article.slug)) return (site || SITE_URL) + '/og/' + article.slug + '.png';
  return (site || SITE_URL) + '/images/og-card.jpg';
}

// The share page itself: OG/Twitter meta for crawlers, an instant script
// redirect into the reader for browsers that run scripts, and — for those that
// do not (feature phones, Opera Mini, text browsers) — a complete readable
// article. There is deliberately no <meta refresh>: it would bounce exactly
// those readers into an app they cannot run.
export function buildShareHtml(article, site){
  const s = site || SITE_URL;
  const url = s + '/s/' + encodeURIComponent(article.slug);
  const dest = '/#/story/' + encodeURIComponent(article.slug);
  const title = escapeHtml(article.headline);
  const desc = escapeHtml(String(article.description).slice(0, 300));
  const image = escapeHtml(pickImage(article, s));
  return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>' + title + ' — AfriPulse Times</title>\n' +
    '<meta name="description" content="' + desc + '">\n' +
    '<link rel="canonical" href="' + escapeHtml(url) + '">\n' +
    '<meta property="og:type" content="article">\n' +
    '<meta property="og:site_name" content="AfriPulse Times">\n' +
    '<meta property="og:title" content="' + title + '">\n' +
    '<meta property="og:description" content="' + desc + '">\n' +
    '<meta property="og:url" content="' + escapeHtml(url) + '">\n' +
    '<meta property="og:image" content="' + image + '">\n' +
    (/\/og\/[a-z0-9-]+\.png$/.test(image) ? '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n' : '') +
    (article.published_at ? '<meta property="article:published_time" content="' + escapeHtml(article.published_at) + '">\n' : '') +
    '<meta name="twitter:card" content="summary_large_image">\n' +
    '<meta name="twitter:title" content="' + title + '">\n' +
    '<meta name="twitter:description" content="' + desc + '">\n' +
    '<meta name="twitter:image" content="' + image + '">\n' +
    '<script type="application/ld+json">' + buildJsonLd(article, s) + '</script>\n' +
    '<script>location.replace(' + JSON.stringify(dest) + ');</script>\n' +
    '<style>body{font-family:Georgia,"Times New Roman",serif;background:#F3EEE2;color:#1B1A17;margin:0;padding:24px;line-height:1.6}' +
    'article{max-width:42rem;margin:0 auto}h1{font-size:28px;line-height:1.2;margin:8px 0 10px}' +
    '.k{font:700 12px -apple-system,Segoe UI,Roboto,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#9A7B1A}' +
    '.d{font-size:18px;color:#4a463d}.m{font:13px -apple-system,Segoe UI,Roboto,sans-serif;color:#6b665a}a{color:#9A7B1A}</style>\n' +
    '</head>\n<body>\n<article>\n<div class="k">AfriPulse Times</div>\n<h1>' + title + '</h1>\n' +
    (article.description !== DEFAULT_DESC ? '<p class="d">' + desc + '</p>\n' : '') +
    (article.published_at ? '<p class="m"><time datetime="' + escapeHtml(article.published_at) + '">' +
      escapeHtml(String(article.published_at).slice(0, 10)) + '</time>' +
      (article.byline ? ' · ' + escapeHtml(article.byline) : '') + '</p>\n' : '') +
    (article.body || []).map((para) => '<p>' + escapeHtml(para) + '</p>').join('\n') + '\n' +
    (article.sourceUrl ? '<p class="m">Source: <a rel="nofollow noopener" href="' + escapeHtml(article.sourceUrl) + '">' +
      escapeHtml(article.sourceLabel || 'original report') + '</a></p>\n' : '') +
    '<p><a href="' + escapeHtml(dest) + '">Open in the AfriPulse Times app</a> · <a href="/today">More of today’s stories</a></p>\n</article>\n</body>\n</html>\n';
}

// ── I/O ───────────────────────────────────────────────────────
async function fetchArticle(slug){
  const cols = 'slug,headline,dek,body,vertical,payload,hero_image,published_at,status';
  const url = SUPABASE_URL + '/rest/v1/articles?slug=eq.' + encodeURIComponent(slug) +
    '&status=eq.published&select=' + encodeURIComponent(cols) + '&limit=1';
  const res = await fetch(url, { headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY } });
  if (!res.ok) return null;
  const rows = await res.json();
  return (Array.isArray(rows) && rows[0]) || null;
}

export default async function handler(req, res){
  const slug = String((req.query && req.query.slug) || '').trim().toLowerCase();
  if (!SLUG_RE.test(slug) || !SUPABASE_URL || !ANON_KEY){
    res.statusCode = 302; res.setHeader('Location', '/'); return res.end();
  }
  let row = null;
  try { row = await fetchArticle(slug); } catch (e) { row = null; }
  if (!row){
    res.statusCode = 302; res.setHeader('Location', '/'); return res.end();
  }
  const html = buildShareHtml(articleFromRow(row), SITE_URL);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Cache at the edge: shares spike fast, articles change rarely after publish.
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');
  return res.end(html);
}
