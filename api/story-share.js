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

// Normalise a DB row to the fields the card needs (typed columns + payload).
export function articleFromRow(row){
  const p = (row && typeof row.payload === 'object' && row.payload) || {};
  return {
    slug: row.slug,
    headline: row.headline || p.headline || 'AfriPulse Times',
    description: stripWireTag(p.standfirst || p.dek || row.dek) || 'Real-time, editor-verified news from all 54 African nations.',
    image: row.hero_image || p.hero_image || null,
    published_at: row.published_at || p.publishedAt || null,
    body: bodyParagraphs(row, p),
    byline: p.byline || null,
    section: row.vertical || p.vertical || null,
    // Wire items keep their attribution wherever the text travels.
    sourceUrl: (p.source === 'rss' && /^https?:\/\//.test(p.sourceUrl || '')) ? p.sourceUrl : null,
    sourceLabel: p.source === 'rss' ? (p.sourceLabel || null) : null
  };
}

function bodyParagraphs(row, p){
  const raw = Array.isArray(p.body) ? p.body : String(p.body || row.body || '').split(/\n{2,}/);
  const dek = norm(stripWireTag(p.standfirst || p.dek || row.dek));
  return raw.map((x) => stripWireTag(x).trim()).filter((x) => x && norm(x) !== dek).slice(0, 60);
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
  return (site || SITE_URL) + '/images/og-card.jpg';
}

// The share page itself: OG/Twitter meta for crawlers, instant redirect for
// people, and a readable fallback for no-JS browsers.
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
    (article.published_at ? '<meta property="article:published_time" content="' + escapeHtml(article.published_at) + '">\n' : '') +
    '<meta name="twitter:card" content="summary_large_image">\n' +
    '<meta name="twitter:title" content="' + title + '">\n' +
    '<meta name="twitter:description" content="' + desc + '">\n' +
    '<meta name="twitter:image" content="' + image + '">\n' +
    '<script type="application/ld+json">' + buildJsonLd(article, s) + '</script>\n' +
    '<script>location.replace(' + JSON.stringify(dest) + ');</script>\n' +
    '<meta http-equiv="refresh" content="0; url=' + escapeHtml(dest) + '">\n' +
    '<style>body{font-family:Georgia,"Times New Roman",serif;background:#F3EEE2;color:#1B1A17;margin:0;padding:24px;line-height:1.6}' +
    'article{max-width:42rem;margin:0 auto}h1{font-size:28px;line-height:1.2;margin:8px 0 10px}' +
    '.k{font:700 12px -apple-system,Segoe UI,Roboto,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#9A7B1A}' +
    '.d{font-size:18px;color:#4a463d}.m{font:13px -apple-system,Segoe UI,Roboto,sans-serif;color:#6b665a}a{color:#9A7B1A}</style>\n' +
    '</head>\n<body>\n<article>\n<div class="k">AfriPulse Times</div>\n<h1>' + title + '</h1>\n' +
    '<p class="d">' + desc + '</p>\n' +
    (article.published_at ? '<p class="m"><time datetime="' + escapeHtml(article.published_at) + '">' +
      escapeHtml(String(article.published_at).slice(0, 10)) + '</time>' +
      (article.byline ? ' · ' + escapeHtml(article.byline) : '') + '</p>\n' : '') +
    (article.body || []).map((para) => '<p>' + escapeHtml(para) + '</p>').join('\n') + '\n' +
    (article.sourceUrl ? '<p class="m">Source: <a rel="nofollow noopener" href="' + escapeHtml(article.sourceUrl) + '">' +
      escapeHtml(article.sourceLabel || 'original report') + '</a></p>\n' : '') +
    '<p><a href="' + escapeHtml(dest) + '">Read on AfriPulse Times</a></p>\n</article>\n</body>\n</html>\n';
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
