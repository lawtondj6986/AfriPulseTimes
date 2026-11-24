// AfriPulse Times — the plain-HTML front page (Vercel serverless function).
//
// Served at /today (vercel.json rewrite). The reader is a JavaScript app, so a
// browser that cannot or will not run scripts — a feature phone, Opera Mini's
// data-saving mode, a text browser, a search crawler — used to get a blank
// page. This renders today's edition as one small HTML document: headlines
// grouped by section, each linking to its full-text story page (/s/<slug>).
// No scripts, no images, no web fonts: a few kilobytes on any connection.
//
// Env: SUPABASE_URL + SUPABASE_ANON_KEY (or the VITE_* pair). Anon key only —
// RLS exposes published articles and nothing else.

import { escapeHtml, stripWireTag } from './story-share.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SITE_URL = (process.env.SITE_URL || 'https://afripulsetimes.com').replace(/\/$/, '');

const ORDER = ['front', 'politics', 'mining', 'markets', 'tech', 'culture', 'sports', 'opinions', 'podcasts'];
const LABELS = {
  front: 'Front Page', politics: 'Politics', mining: 'Mining & Energy', markets: 'Business & Markets',
  tech: 'Tech & Innovation', culture: 'Culture', sports: 'Sports', opinions: 'Opinions', podcasts: 'Podcasts'
};

// ── pure helpers (exported for tests) ─────────────────────────
export function frontItemFromRow(row){
  const p = (row && typeof row.payload === 'object' && row.payload) || {};
  let section = row.vertical || p.vertical || 'front';
  if (section === 'voices') section = 'opinions';
  if (!LABELS[section]) section = 'front';
  return {
    slug: row.slug,
    headline: row.headline || p.headline || '',
    dek: stripWireTag(p.standfirst || p.dek || row.dek || '').slice(0, 220),
    section,
    published_at: row.published_at || null
  };
}

function shortDate(iso){
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function buildFrontHtml(items, site, now){
  const s = (site || SITE_URL).replace(/\/$/, '');
  const list = (items || []).filter((it) => it && it.slug && it.headline);
  const today = new Date(typeof now === 'number' ? now : Date.now()).toISOString().slice(0, 10);
  const sections = ORDER.map((key) => {
    const rows = list.filter((it) => it.section === key);
    if (!rows.length) return '';
    return '<h2>' + escapeHtml(LABELS[key]) + '</h2>\n<ul>\n' + rows.map((it) => {
      const when = shortDate(it.published_at);
      return '<li><a href="/s/' + encodeURIComponent(it.slug) + '">' + escapeHtml(it.headline) + '</a>' +
        (it.dek ? '<p>' + escapeHtml(it.dek) + '</p>' : '') +
        (when ? '<small><time datetime="' + escapeHtml(it.published_at) + '">' + when + '</time></small>' : '') + '</li>';
    }).join('\n') + '\n</ul>';
  }).filter(Boolean).join('\n');
  const ld = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'ItemList', name: 'AfriPulse Times — today',
    itemListElement: list.slice(0, 40).map((it, i) => ({
      '@type': 'ListItem', position: i + 1, url: s + '/s/' + encodeURIComponent(it.slug), name: it.headline
    }))
  }).replace(/</g, '\\u003c');
  const desc = 'Today’s news from across Africa — the plain, fast edition of AfriPulse Times.';
  return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>AfriPulse Times — today’s edition</title>\n' +
    '<meta name="description" content="' + escapeHtml(desc) + '">\n' +
    '<link rel="canonical" href="' + escapeHtml(s) + '/today">\n' +
    '<link rel="alternate" type="application/rss+xml" title="AfriPulse Times" href="/feed.xml">\n' +
    '<meta property="og:type" content="website">\n<meta property="og:site_name" content="AfriPulse Times">\n' +
    '<meta property="og:title" content="AfriPulse Times — today’s edition">\n' +
    '<meta property="og:description" content="' + escapeHtml(desc) + '">\n' +
    '<meta property="og:url" content="' + escapeHtml(s) + '/today">\n' +
    '<meta property="og:image" content="' + escapeHtml(s) + '/images/og-card.jpg">\n' +
    '<script type="application/ld+json">' + ld + '</script>\n' +
    '<style>body{font-family:Georgia,"Times New Roman",serif;background:#F3EEE2;color:#1B1A17;margin:0;padding:16px;line-height:1.5}' +
    'main{max-width:42rem;margin:0 auto}h1{font-size:26px;margin:4px 0 2px}h1 span{color:#9A7B1A}' +
    '.m,small{font:13px -apple-system,Segoe UI,Roboto,sans-serif;color:#6b665a}' +
    'h2{font-size:15px;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #C9A227;padding-bottom:4px;margin:26px 0 6px}' +
    'ul{list-style:none;margin:0;padding:0}li{padding:11px 0;border-bottom:1px solid #ddd6c4}' +
    'li a{font-size:19px;font-weight:700;color:#1B1A17;text-decoration:none}li p{margin:3px 0;color:#4a463d;font-size:15px}' +
    'a{color:#9A7B1A}nav{margin:10px 0 0}nav a{margin-right:14px;font:600 14px -apple-system,Segoe UI,Roboto,sans-serif}' +
    'footer{margin:28px 0 12px}</style>\n</head>\n<body>\n<main>\n' +
    '<h1>Afri<span>Pulse</span> Times</h1>\n<p class="m">Today’s edition · ' + today + ' · plain, fast version</p>\n' +
    '<nav><a href="/">Full edition (app)</a><a href="/feed.xml">RSS</a></nav>\n' +
    (sections || '<p>The newsroom is filing. Please check back shortly.</p>') + '\n' +
    '<footer class="m"><a href="/">Open the full edition</a> · <a href="/afripulse-preview.html#/about">About</a> · ' +
    '<a href="/afripulse-preview.html#/privacy">Privacy</a></footer>\n</main>\n</body>\n</html>\n';
}

// ── I/O ───────────────────────────────────────────────────────
async function fetchRows(){
  const url = SUPABASE_URL + '/rest/v1/articles?status=eq.published' +
    '&select=' + encodeURIComponent('slug,headline,dek,vertical,payload,published_at') +
    '&order=published_at.desc&limit=40';
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
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  return res.end(buildFrontHtml(rows.map(frontItemFromRow), SITE_URL));
}
