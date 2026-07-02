// AfriPulse Times — server-side RSS aggregator (Vercel serverless function).
//
// Reads active feeds from rss_sources, fetches + parses each one server-side
// (no CORS proxy), dedupes against existing articles by source URL, and inserts
// new items into `articles` with status='published', source='rss'.
//
// Invoked by:
//   • Vercel cron every 15 min (see vercel.json) — server-to-server.
//   • The admin "Pull live wire" button — authenticated browser request.
//
// Auth: if CRON_SECRET is set, the request must carry it as a Bearer token OR a
// valid Supabase user JWT. If CRON_SECRET is unset, the endpoint runs open and
// logs a warning (fine for local `vercel dev`; set it before production).
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (service role bypasses RLS so the
// function can insert), and optionally CRON_SECRET.

import { createClient } from '@supabase/supabase-js';
import Parser from 'rss-parser';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MAX_ITEMS_PER_FEED = 10;

// Vertical classifier (mirrors the keyword logic that used to live in the page).
const VKW = {
  mining:['cobalt','gold','copper','lithium','platinum','oil','gas','energy','mining','mine','solar','renewable','lng','crude','uranium','battery'],
  markets:['rand','naira','bourse','stock','jse','ngx','imf','inflation','gdp','currency','market','trade','afcfta','tariff','bank','rate','exchange','listing','earnings'],
  tech:['ai ','artificial intelligence','tech','startup','fintech','app ','platform','data','cloud','digital','m-pesa','safaricom','crypto','blockchain','software'],
  culture:['music','film','art','festival','burna','nollywood','culture','tour','afrobeats','album','movie'],
  sports:['football','afcon','soccer','match','goal','striker','player','caf','athletics','olympic','world cup','squad','tournament','marathon','athlete','runner','sport','medal'],
  politics:['election','senate','parliament','president','minister','vote','government','reform','policy','bill','protest','au summit','peace']
};
const VDEF = {
  front:{emoji:'🌍',color:'#0e2818'}, politics:{emoji:'🏛️',color:'#1a3a1a'},
  mining:{emoji:'⛏️',color:'#3a1a0a'}, markets:{emoji:'📊',color:'#0a1a2a'},
  tech:{emoji:'🤖',color:'#2a2a0a'}, culture:{emoji:'🎭',color:'#2a1a2a'},
  sports:{emoji:'⚽',color:'#1a1a3a'}, opinions:{emoji:'✍️',color:'#241a2a'},
  podcasts:{emoji:'🎙️',color:'#1a1a3a'}
};
const VLABEL = {
  front:'Front Page', politics:'Politics', mining:'Mining & Energy',
  markets:'Business & Markets', tech:'Tech & Innovation', culture:'Culture',
  sports:'Sports', opinions:'Opinions', podcasts:'Podcasts'
};

export function guessVertical(title, desc, hint){
  const text = ((title||'') + ' ' + (desc||'')).toLowerCase();
  const scores = {};
  for(const v in VKW){ scores[v] = VKW[v].reduce((s,w)=> s + (text.indexOf(w) > -1 ? 1 : 0), 0); }
  if(hint && scores[hint] !== undefined) scores[hint] += 0.5;
  const best = Object.keys(scores).sort((a,b)=> scores[b] - scores[a])[0];
  return scores[best] > 0 ? best : (hint || 'front');
}
function slugify(s){
  return (s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,72) || 'story';
}
// Short deterministic hash of the source URL → stable, collision-resistant slug.
function shortHash(s){
  let h = 5381;
  for(let i=0;i<s.length;i++){ h = ((h << 5) + h) ^ s.charCodeAt(i); }
  return (h >>> 0).toString(36).slice(0,6);
}
function clean(s){ return (s||'').replace(/<[^>]+>/g,'').trim(); }

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'AfriPulseTimes/1.0 (+https://afripulsetimes.com)' },
  // Capture the standard image-bearing fields most news feeds ship.
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
      ['content:encoded', 'contentEncoded'],
      ['itunes:image', 'itunesImage']
    ]
  }
});

const IMG_EXT_RE = /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i;
// Upgrade http→https so images aren't blocked as mixed content on our https site.
// If a host doesn't serve https the <img> simply fails and the branded
// placeholder shows instead — so this is always safe.
function httpsify(u){ return (typeof u === 'string' ? u : '').trim().replace(/^http:\/\//i, 'https://'); }
function attrUrl(node, keys){
  const n = Array.isArray(node) ? node[0] : node;
  if(!n) return '';
  const a = n.$ || n;
  for(const k of keys){ if(a && a[k]) return a[k]; }
  return typeof n === 'string' ? n : '';
}
function firstImgInHtml(html){
  const m = /<img[^>]+src=["']([^"'>]+)["']/i.exec(html || '');
  return m ? m[1] : '';
}

// Best representative image for a feed item, checked in priority order. Returns
// an https URL or null. Pure + exported for tests.
export function extractImage(it){
  if(!it) return null;
  // 1) <media:content medium="image"> (MRSS)
  const mc = it.mediaContent;
  const mcArr = Array.isArray(mc) ? mc : (mc ? [mc] : []);
  for(const m of mcArr){
    const a = (m && m.$) || {};
    if(a.url && (a.medium === 'image' || String(a.type || '').indexOf('image') === 0 || IMG_EXT_RE.test(a.url))) {
      return httpsify(a.url);
    }
  }
  // 2) <media:thumbnail url="...">
  const mt = attrUrl(it.mediaThumbnail, ['url']);
  if(mt) return httpsify(mt);
  // 3) <enclosure type="image/..." url="...">
  const enc = it.enclosure;
  if(enc && enc.url && (String(enc.type || '').indexOf('image') === 0 || IMG_EXT_RE.test(enc.url))) {
    return httpsify(enc.url);
  }
  // 4) <itunes:image href="..."> (podcasts)
  const ii = attrUrl(it.itunesImage, ['href', 'url']);
  if(ii) return httpsify(ii);
  // 5) first <img> inside the article HTML
  const img = firstImgInHtml(it.contentEncoded || it['content:encoded'] || it.content);
  if(img) return httpsify(img);
  return null;
}

// Turn parsed feed items into article rows, skipping anything already seen (by
// source URL) and adding newly used URLs to `seen`. Pure + exported for tests.
export function buildRows(items, src, seen){
  const label = src.label || src.url;
  const rows = [];
  for(const it of (items || [])){
    const link = clean(it.link || it.guid || '');
    if(!link || seen.has(link)) continue;            // dedupe by source URL
    const title = clean(it.title);
    if(title.length < 10) continue;
    seen.add(link);

    let desc = clean(it.contentSnippet || it.summary || it.content || '');
    if(desc.length > 500) desc = desc.slice(0,497) + '…';
    const vert = guessVertical(title, desc, src.hint_vertical);
    const def = VDEF[vert] || VDEF.front;
    const vlabel = VLABEL[vert] || vert;
    const publishedAt = it.isoDate
      || (it.pubDate ? new Date(it.pubDate).toISOString() : new Date().toISOString());
    const slug = 'wire-' + slugify(title).slice(0,56) + '-' + shortHash(link);

    // Relevant photo from the source feed (null → branded placeholder in the UI).
    const image = extractImage(it);
    const media = image ? { type:'image', src: image, caption: '', credit: label } : null;

    // Full front-end article object → lossless render via articles.payload.
    const payload = {
      slug, vertical:vert, kicker: vlabel + ' · ' + label, headline:title,
      standfirst: desc || title, byline: label, dateline:'Wire',
      readingMin: Math.max(2, Math.ceil((desc.length || 200) / 600)),
      emoji: def.emoji, color: def.color, status:'published', publishedAt,
      tags: [label, 'Live wire', vlabel], body: [desc || 'Full story at source.'],
      media, source:'rss', sourceUrl: link, sourceLabel: label
    };
    rows.push({
      slug, headline:title, dek: desc || title, body: desc || 'Full story at source.',
      vertical:vert, region:null, author_slug:null, hero_image: image || null, video_url:null,
      status:'published', source:'rss', source_url: link, published_at: publishedAt, payload
    });
  }
  return rows;
}

async function isAuthorized(req, admin){
  const header = req.headers['authorization'] || '';
  const token = header.replace(/^Bearer\s+/i,'').trim();
  if(process.env.CRON_SECRET){
    if(token && token === process.env.CRON_SECRET) return true;       // cron / server
    if(token){                                                         // admin user JWT
      try{ const { data, error } = await admin.auth.getUser(token); if(!error && data && data.user) return true; }catch(e){}
    }
    return false;
  }
  console.warn('[pull-wire] CRON_SECRET not set — endpoint is unprotected. Set it before production.');
  return true;
}

export default async function handler(req, res){
  const started = Date.now();

  if(!SUPABASE_URL || !SERVICE_KEY){
    console.error('[pull-wire] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ ok:false, error:'Server not configured (missing Supabase env vars).' });
  }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth:{ persistSession:false, autoRefreshToken:false } });

  if(!(await isAuthorized(req, admin))){
    console.warn('[pull-wire] rejected unauthorized request');
    return res.status(401).json({ ok:false, error:'Unauthorized' });
  }

  // 1. Active feed sources.
  const { data: sources, error: srcErr } = await admin
    .from('rss_sources').select('*').eq('active', true);
  if(srcErr){
    console.error('[pull-wire] failed to load rss_sources:', srcErr.message);
    return res.status(500).json({ ok:false, error: srcErr.message });
  }
  console.log(`[pull-wire] start · ${sources.length} active source(s)`);

  // 2. Existing wire URLs, for dedupe by source_url.
  const { data: existing, error: exErr } = await admin
    .from('articles').select('source_url').eq('source','rss').limit(5000);
  if(exErr) console.warn('[pull-wire] could not load existing URLs (continuing):', exErr.message);
  const seen = new Set((existing || []).map(r => r.source_url).filter(Boolean));

  const report = [];
  let totalInserted = 0;

  // 3. Fetch + parse + insert, one feed at a time (clear per-feed logging).
  for(const src of sources){
    const label = src.label || src.url;
    try{
      const feed = await parser.parseURL(src.url);
      const items = (feed.items || []).slice(0, MAX_ITEMS_PER_FEED);
      const rows = buildRows(items, src, seen);

      let insertedHere = 0;
      if(rows.length){
        // onConflict slug + ignoreDuplicates → safe even if two items collide.
        const { data: ins, error: insErr } = await admin
          .from('articles')
          .upsert(rows, { onConflict:'slug', ignoreDuplicates:true })
          .select('id');
        if(insErr) throw insErr;
        insertedHere = ins ? ins.length : 0;
      }
      totalInserted += insertedHere;

      // Best-effort: stamp when we last fetched this source.
      await admin.from('rss_sources')
        .update({ last_fetched_at: new Date().toISOString() })
        .eq('id', src.id);

      console.log(`[pull-wire] OK   ${label} · parsed ${items.length}, inserted ${insertedHere}`);
      report.push({ label, ok:true, parsed: items.length, inserted: insertedHere });
    }catch(err){
      const msg = String((err && err.message) || err);
      console.error(`[pull-wire] FAIL ${label} · ${msg}`);
      report.push({ label, ok:false, error: msg });
    }
  }

  const okCount = report.filter(r => r.ok).length;
  const ms = Date.now() - started;
  console.log(`[pull-wire] done · inserted ${totalInserted} new · ${okCount}/${sources.length} feed(s) ok · ${ms}ms`);
  return res.status(200).json({ ok:true, inserted: totalInserted, feeds: report, ms });
}
