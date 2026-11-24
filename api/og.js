// AfriPulse Times — per-story share image (Vercel serverless function).
//
// Served at /og/<slug>.png (vercel.json rewrite). When a story has no photo of
// its own, its link preview in WhatsApp, Telegram, X and iMessage used to be
// the same generic card as every other story. This draws a branded 1200×630
// card carrying the story's own section and headline, so every shared link
// looks like that story.
//
// Env: SUPABASE_URL + SUPABASE_ANON_KEY (or the VITE_* pair). Anon key only —
// RLS exposes published articles and nothing else.

import { ImageResponse } from '@vercel/og';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SLUG_RE = /^[a-z0-9-]{1,120}$/;
const FALLBACK = '/images/og-card.jpg';

const SECTIONS = {
  front: 'Front Page', politics: 'Politics', mining: 'Mining & Energy', markets: 'Business & Markets',
  tech: 'Tech & Innovation', culture: 'Culture', sports: 'Sports', opinions: 'Opinions', voices: 'Opinions',
  podcasts: 'Podcasts'
};
const AFRICA = 'M16,12 Q24,7 33,9 Q48,9 60,11 L63,13 Q67,22 70,32 Q76,37 83,42 Q74,48 69,51 Q66,60 63,70 Q60,80 55,87 Q50,95 45,97 Q40,94 39,87 Q35,74 34,63 Q33,57 36,54 Q33,52 29,51 Q22,52 17,50 Q9,46 6,36 Q6,30 10,23 Q12,17 16,12 Z';

// ── pure helpers (exported for tests) ─────────────────────────
export function sectionLabel(v){ return SECTIONS[v] || 'AfriPulse Times'; }

// Long headlines shrink so they always fit in four lines.
export function headlineSize(text){
  const n = String(text || '').length;
  return n <= 50 ? 76 : n <= 80 ? 64 : n <= 115 ? 54 : 46;
}

export function clipHeadline(text){
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > 150 ? t.slice(0, 147).replace(/\s+\S*$/, '') + '…' : t;
}

const h = (type, style, children, extra) => ({ type, props: Object.assign({ style, children }, extra || {}) });

// The card, as the plain element tree @vercel/og renders (no JSX needed).
export function ogElement(article){
  const headline = clipHeadline(article.headline) || 'AfriPulse Times';
  const date = article.published_at ? String(article.published_at).slice(0, 10) : '';
  return h('div', {
    display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
    backgroundImage: 'linear-gradient(135deg, #12351F 0%, #0E2818 55%, #081810 100%)',
    color: '#F3EAD4', borderTop: '14px solid #C9A227', borderBottom: '14px solid #C9A227',
    padding: '44px 64px 40px'
  }, [
    h('div', { display: 'flex', alignItems: 'center' }, [
      h('svg', { marginRight: 18 }, [ h('path', undefined, undefined, { d: AFRICA, fill: '#D9B94A' }) ],
        { width: 66, height: 66, viewBox: '0 0 100 100' }),
      h('div', { display: 'flex', fontSize: 40, fontWeight: 700, letterSpacing: -0.5 }, [
        h('span', { color: '#FBF6E9' }, 'Afri'),
        h('span', { color: '#C9A227' }, 'Pulse'),
        h('span', { color: '#FBF6E9', marginLeft: 12 }, 'Times')
      ])
    ]),
    h('div', { display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }, [
      h('div', { display: 'flex', fontSize: 24, letterSpacing: 4, color: '#E9D07A', textTransform: 'uppercase', marginBottom: 18 },
        sectionLabel(article.vertical)),
      h('div', { display: 'flex', fontSize: headlineSize(headline), lineHeight: 1.14, color: '#FBF6E9', letterSpacing: -1 },
        headline)
    ]),
    h('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      borderTop: '2px solid rgba(201,162,39,0.5)', paddingTop: 20, fontSize: 26 }, [
      h('div', { display: 'flex', color: '#E9D07A' }, 'afripulsetimes.com'),
      h('div', { display: 'flex', color: '#AFC0A8' }, date ? date + '  ·  54 nations' : '54 nations')
    ])
  ]);
}

// ── I/O ───────────────────────────────────────────────────────
async function fetchArticle(slug){
  const url = SUPABASE_URL + '/rest/v1/articles?slug=eq.' + encodeURIComponent(slug) +
    '&status=eq.published&select=' + encodeURIComponent('slug,headline,vertical,payload,published_at') + '&limit=1';
  const res = await fetch(url, { headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY } });
  if (!res.ok) return null;
  const rows = await res.json();
  const row = Array.isArray(rows) && rows[0];
  if (!row) return null;
  const p = (typeof row.payload === 'object' && row.payload) || {};
  return {
    headline: row.headline || p.headline || '',
    vertical: row.vertical || p.vertical || 'front',
    published_at: row.published_at || null
  };
}

function fallback(res){ res.statusCode = 302; res.setHeader('Location', FALLBACK); return res.end(); }

export default async function handler(req, res){
  const slug = String((req.query && req.query.slug) || '').replace(/\.png$/i, '').trim().toLowerCase();
  if (!SLUG_RE.test(slug) || !SUPABASE_URL || !ANON_KEY) return fallback(res);
  try {
    const article = await fetchArticle(slug);
    if (!article || !article.headline) return fallback(res);
    const img = new ImageResponse(ogElement(article), { width: 1200, height: 630 });
    const buf = Buffer.from(await img.arrayBuffer());
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/png');
    // Headlines rarely change after publish; let the edge keep the card for a day.
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
    return res.end(buf);
  } catch (e) {
    console.error('[og] render failed:', (e && e.message) || e);
    return fallback(res);
  }
}
