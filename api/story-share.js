// AfriPulse Times — per-story share pages (Vercel serverless function).
//
// Problem: the site is a hash-routed SPA, so every shared story link unfurls
// the same generic preview in WhatsApp/Telegram/X — crawlers never execute
// the router. This function gives each story a real URL with its own
// OpenGraph card:
//
//     https://afripulsetimes.com/s/<slug>
//
// Crawlers read per-story meta (headline, standfirst, image); humans are
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

// Normalise a DB row to the fields the card needs (typed columns + payload).
export function articleFromRow(row){
  const p = (row && typeof row.payload === 'object' && row.payload) || {};
  return {
    slug: row.slug,
    headline: row.headline || p.headline || 'AfriPulse Times',
    description: p.standfirst || p.dek || row.dek || 'Real-time, editor-verified news from all 54 African nations.',
    image: row.hero_image || p.hero_image || null,
    published_at: row.published_at || p.publishedAt || null
  };
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
    '<script>location.replace(' + JSON.stringify(dest) + ');</script>\n' +
    '<meta http-equiv="refresh" content="0; url=' + escapeHtml(dest) + '">\n' +
    '<style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0E2818;color:#F3EEE2;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:24px}a{color:#C9A227}</style>\n' +
    '</head>\n<body>\n<p><strong>' + title + '</strong><br>' +
    '<a href="' + escapeHtml(dest) + '">Read on AfriPulse Times</a></p>\n</body>\n</html>\n';
}

// ── I/O ───────────────────────────────────────────────────────
async function fetchArticle(slug){
  const cols = 'slug,headline,dek,payload,hero_image,published_at,status';
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
