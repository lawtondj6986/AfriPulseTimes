// AfriPulse Times — live news sitemap (Vercel serverless function).
//
// Served at /sitemap-news.xml (vercel.json rewrite). Lists every published
// story's permanent URL (/s/<slug>) so search engines can find them without
// executing the hash-routed reader, and marks stories from the last two days
// with Google News tags (<news:news>), which is the window Google News reads.
//
// Env: SUPABASE_URL + SUPABASE_ANON_KEY (or the VITE_* pair). Anon key only —
// RLS exposes published articles and nothing else.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SITE_URL = (process.env.SITE_URL || 'https://afripulsetimes.com').replace(/\/$/, '');
const NEWS_WINDOW_MS = 48 * 3600 * 1000;
const MAX_URLS = 1000;

// ── pure helpers (exported for tests) ─────────────────────────
export function xmlEscape(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

export function isoOrNull(v){
  const d = v ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? d.toISOString() : null;
}

export function buildSitemap(rows, site, now){
  const s = (site || SITE_URL).replace(/\/$/, '');
  const t = typeof now === 'number' ? now : Date.now();
  const urls = (rows || []).filter((r) => r && r.slug).map((r) => {
    const p = (typeof r.payload === 'object' && r.payload) || {};
    const when = isoOrNull(r.published_at);
    const title = r.headline || p.headline || '';
    const fresh = when && title && (t - new Date(when).getTime()) <= NEWS_WINDOW_MS;
    return '  <url>\n' +
      '    <loc>' + xmlEscape(s + '/s/' + encodeURIComponent(r.slug)) + '</loc>\n' +
      (when ? '    <lastmod>' + when + '</lastmod>\n' : '') +
      (fresh ? '    <news:news>\n' +
        '      <news:publication><news:name>AfriPulse Times</news:name><news:language>en</news:language></news:publication>\n' +
        '      <news:publication_date>' + when + '</news:publication_date>\n' +
        '      <news:title>' + xmlEscape(title) + '</news:title>\n' +
        '    </news:news>\n' : '') +
      '  </url>';
  }).join('\n');
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
    'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n' +
    '  <url>\n    <loc>' + xmlEscape(s) + '/</loc>\n    <changefreq>hourly</changefreq>\n  </url>\n' +
    '  <url>\n    <loc>' + xmlEscape(s) + '/today</loc>\n    <changefreq>hourly</changefreq>\n  </url>\n' +
    (urls ? urls + '\n' : '') + '</urlset>\n';
}

// ── I/O ───────────────────────────────────────────────────────
async function fetchRows(){
  const url = SUPABASE_URL + '/rest/v1/articles?status=eq.published' +
    '&select=' + encodeURIComponent('slug,headline,published_at') +
    '&order=published_at.desc&limit=' + MAX_URLS;
  const res = await fetch(url, { headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY } });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

export default async function handler(req, res){
  let rows = [];
  if (SUPABASE_URL && ANON_KEY){
    try { rows = await fetchRows(); } catch (e) { rows = []; }
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
  return res.end(buildSitemap(rows, SITE_URL));
}
