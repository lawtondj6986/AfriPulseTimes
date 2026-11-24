// AfriPulse Times — public RSS feed (Vercel serverless function).
//
// Serves the 30 latest published stories as RSS 2.0 at /feed.xml (wired by a
// vercel.json rewrite). RSS is the lingua franca of news distribution:
// aggregators, partner newsrooms, podcast tools and researchers all start by
// asking "where's your feed?" — now there is one.
//
// Item links point at the per-story share pages (/s/<slug>), so every feed
// click also carries proper per-story OpenGraph previews.
//
// Env: SUPABASE_URL + SUPABASE_ANON_KEY (or the VITE_* pair). Anon key only —
// RLS exposes published articles and nothing else.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SITE_URL = (process.env.SITE_URL || 'https://afripulsetimes.com').replace(/\/$/, '');

// ── pure helpers (exported for tests) ─────────────────────────
export function xmlEscape(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

export function rfc822(iso){
  const d = iso ? new Date(iso) : new Date();
  return isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
}

export function feedItemFromRow(row){
  const p = (row && typeof row.payload === 'object' && row.payload) || {};
  return {
    slug: row.slug,
    title: row.headline || p.headline || 'AfriPulse Times',
    description: p.standfirst || p.dek || row.dek || '',
    category: row.vertical || p.vertical || 'front',
    published_at: row.published_at || p.publishedAt || null
  };
}

export function buildRss(items, site){
  const s = (site || SITE_URL).replace(/\/$/, '');
  const now = new Date().toUTCString();
  const body = items.map((it) => {
    const link = s + '/s/' + encodeURIComponent(it.slug);
    return '    <item>\n' +
      '      <title>' + xmlEscape(it.title) + '</title>\n' +
      '      <link>' + xmlEscape(link) + '</link>\n' +
      '      <guid isPermaLink="true">' + xmlEscape(link) + '</guid>\n' +
      (it.description ? '      <description>' + xmlEscape(it.description) + '</description>\n' : '') +
      '      <category>' + xmlEscape(it.category) + '</category>\n' +
      '      <pubDate>' + rfc822(it.published_at) + '</pubDate>\n' +
      '    </item>';
  }).join('\n');
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n' +
    '  <channel>\n' +
    '    <title>AfriPulse Times</title>\n' +
    '    <link>' + xmlEscape(s) + '/</link>\n' +
    '    <description>Real-time, editor-verified news from all 54 African nations — five languages, every phone, online or off.</description>\n' +
    '    <language>en</language>\n' +
    '    <lastBuildDate>' + now + '</lastBuildDate>\n' +
    '    <atom:link href="' + xmlEscape(s) + '/feed.xml" rel="self" type="application/rss+xml"/>\n' +
    '    <image><url>' + xmlEscape(s) + '/icons/icon-512.png</url><title>AfriPulse Times</title><link>' + xmlEscape(s) + '/</link></image>\n' +
    body + '\n' +
    '  </channel>\n' +
    '</rss>\n';
}

// ── I/O ───────────────────────────────────────────────────────
async function fetchLatest(){
  const cols = 'slug,headline,dek,vertical,payload,published_at,status';
  const url = SUPABASE_URL + '/rest/v1/articles?status=eq.published' +
    '&select=' + encodeURIComponent(cols) + '&order=published_at.desc&limit=30';
  const res = await fetch(url, { headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY } });
  if (!res.ok) throw new Error('supabase ' + res.status);
  return res.json();
}

export default async function handler(req, res){
  if (!SUPABASE_URL || !ANON_KEY){
    res.statusCode = 503; return res.end('feed unavailable');
  }
  let rows = [];
  try { rows = await fetchLatest(); } catch (e) {
    res.statusCode = 502; return res.end('feed unavailable');
  }
  const xml = buildRss((rows || []).map(feedItemFromRow), SITE_URL);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  return res.end(xml);
}
