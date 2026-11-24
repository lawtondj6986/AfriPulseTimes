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
import { tidyHeadline } from './story-share.js';
import Parser from 'rss-parser';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MAX_ITEMS_PER_FEED = 10;

// Section classifier.
//
// Every term is matched as a whole word (plurals allowed), never as a fragment:
// the old substring test filed a cricket report under Markets because
// "frustrate" contains "rate", and a diplomatic accord under Culture because
// "counterpart" contains "art". Each section has strong terms (2 points) and
// weak ones (1); a hit in the headline counts double. A story needs 2 points
// to leave the front page, so one weak word in the body decides nothing.
const VKW = {
  sports: {
    strong: ['football','footballer','soccer','afcon','fifa','world cup','premier league','la liga','serie a','bundesliga','champions league',
      'npfl','psl','striker','goalkeeper','midfielder','defender','tennis','atp','wta','grand slam','wimbledon','cricket','test match','odi','t20',
      'wicket','rugby','springboks','athletics','olympic','olympics','paralympic','marathon','sprinter','athlete','boxing','boxer','basketball','nba',
      'formula 1','formula one','grand prix','golf','cycling','semi-final','semifinal','quarter-final','quarterfinal','super eagles','super falcons',
      'bafana bafana','harambee stars','black stars','indomitable lions','flamingos','falconets','manchester united','man u','man utd','liverpool',
      'arsenal','chelsea','barcelona','real madrid','transfer window','head coach','penalty shootout'],
    weak: ['match','goal','squad','tournament','coach','league','medal','champion','championship','fixture','stadium','sport','sports','innings','draw']
  },
  mining: {
    strong: ['mining','miner','gold','copper','cobalt','lithium','platinum','uranium','diamond','manganese','bauxite','iron ore','coal','crude','opec',
      'refinery','lng','natural gas','gas pipeline','oil','oilfield','petroleum','petrol','diesel','electricity','power grid','load shedding','loadshedding',
      'eskom','solar','renewable','hydropower','wind farm','nuclear','energy'],
    weak: ['mine','fuel','gas','power','pipeline','megawatt','megawatts','mw','barrel']
  },
  markets: {
    strong: ['stock market','stocks','stock','shares','bourse','jse','ngx','nse','inflation','gdp','interest rate','central bank','imf','world bank',
      'currency','naira','rand','cedi','shilling','kwacha','birr','forex','exchange rate','exports','imports','tariff','afcfta','investor','investment',
      'earnings','profit','revenue','ipo','eurobond','bond','debt','economy','economic','trade deal','bank','banking','recession','fiscal','monetary',
      'devaluation','remittance','remittances','dividend','shareholder'],
    weak: ['market','markets','trade','business','company','firm','price','prices','budget','tax','taxes','loan','loans','growth']
  },
  tech: {
    strong: ['fintech','startup','start-up','artificial intelligence','ai','software','app','smartphone','internet','broadband','5g','4g','telecom',
      'telecoms','safaricom','mtn','airtel','m-pesa','mobile money','crypto','cryptocurrency','bitcoin','blockchain','cybersecurity','cyberattack',
      'data centre','data center','tech','technology','e-commerce','ecommerce','satellite','starlink','semiconductor','robotics','instant payment'],
    weak: ['digital','platform','online','data','innovation','developer','developers','device','devices']
  },
  culture: {
    strong: ['music','musician','album','afrobeats','amapiano','film','movie','nollywood','cinema','festival','concert','exhibition','artist','fashion',
      'novel','author','literature','museum','heritage','cuisine','actor','actress','singer','rapper','grammy','grammys','oscar','oscars','poet','poetry',
      'gallery','theatre','theater','choreographer','comedian','documentary'],
    weak: ['culture','cultural','art','arts','book','dance','tour','award','awards','celebrity']
  },
  politics: {
    strong: ['election','electoral','parliament','senate','senator','president','presidential','prime minister','minister','government','cabinet','coup',
      'junta','diplomatic','diplomacy','diplomat','ceasefire','sanction','sanctions','referendum','opposition','lawmaker','lawmakers','governor',
      'ambassador','constitution','supreme court','protest','protesters','military','army','troops','rebels','insurgents','insurgency','airstrike',
      'drone','au summit','african union','ecowas','sadc','peace talks','peacekeepers','impeachment','legislature','ruling party','mp','mps'],
    weak: ['policy','reform','bill','vote','security','police','court','summit','peace','war','conflict','attack','killed','arrested','campaign','law']
  }
};
// Earlier sections win ties: a football story that mentions a "president" is still sport.
const VORDER = ['sports', 'mining', 'tech', 'markets', 'culture', 'politics'];
const termRe = (t) => new RegExp('(^|[^a-z0-9])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(s|es)?(?=$|[^a-z0-9])', 'i');
// The matcher already accepts plurals, so a listed plural ("awards" beside
// "award") would count the same word twice. Drop those at load time.
const VRULES = VORDER.map((v) => {
  const all = new Set(VKW[v].strong.concat(VKW[v].weak));
  const single = (t) => !((t.endsWith('es') && all.has(t.slice(0, -2))) || (t.endsWith('s') && all.has(t.slice(0, -1))));
  return {
    v,
    rules: VKW[v].strong.filter(single).map((t) => ({ re: termRe(t), w: 2 }))
      .concat(VKW[v].weak.filter(single).map((t) => ({ re: termRe(t), w: 1 })))
  };
});

export function guessVertical(title, desc, hint){
  // Place names and phrases that contain a keyword but are not about it.
  const quiet = (x) => String(x || '').toLowerCase().replace(/\b(west bank|river ?bank|food bank|blood bank|data bank|gold coast|golden|goldman)\b/g, ' ');
  const head = quiet(title);
  const body = quiet(desc);
  // Signed comment is opinion whatever it is about.
  if (/^\s*(editorial|opinion|analysis|comment)\s*[:\-–]/i.test(head) || /,\s*[Bb]y\s+[A-Z][\w'’.-]+(\s+[A-Z][\w'’.-]+){0,3}\s*$/.test(String(title || ''))) return 'opinions';
  let best = null, bestScore = 0;
  for (const { v, rules } of VRULES) {
    let score = 0;
    for (const r of rules) { if (r.re.test(head)) score += r.w * 2; else if (r.re.test(body)) score += r.w; }
    if (hint === v) score += 1;
    if (score > bestScore) { best = v; bestScore = score; }
  }
  return bestScore >= 2 ? best : (hint || 'front');
}

// Summaries that are not summaries: page styling or markup that leaked out of a
// feed, a sponsor line, or the headline again.
const norm = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9À-￿]+/g, ' ').trim();
// `paragraph` skips the length rule: a short paragraph is still a paragraph.
export function isJunkText(text, headline, paragraph){
  const t = String(text || '').trim();
  if (!paragraph && t.length < 12) return true;
  if (/\/\*|\*\/|box-sizing|mso-|!important|\{[^{}]{0,200}:[^{}]{0,200}\}|<\/?[a-z][^>]*>/i.test(t)) return true;
  if (/^(in partnership with|sponsored( content| by)?|advertisement|presented by)\b/i.test(t)) return true;
  if (headline && norm(t) === norm(headline)) return true;
  return false;
}

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


// Geo classifier — infers a region + country (+ a capital dateline when named) from
// the story text, so the coverage map and region archives can place wire stories.
// Mirrors the sub-regional taxonomy the front end uses. capitals: city → country.
const REGION_GEO = {
  'north-africa':   { capitals:{ 'Cairo':'Egypt','Rabat':'Morocco','Algiers':'Algeria','Tunis':'Tunisia','Tripoli':'Libya','Khartoum':'Sudan' },
                      countries:['Egypt','Morocco','Algeria','Tunisia','Libya','Sudan','Mauritania'] },
  'west-africa':    { capitals:{ 'Lagos':'Nigeria','Abuja':'Nigeria','Accra':'Ghana','Dakar':'Senegal','Abidjan':"Côte d'Ivoire",'Bamako':'Mali','Freetown':'Sierra Leone','Monrovia':'Liberia','Conakry':'Guinea','Lomé':'Togo','Cotonou':'Benin' },
                      countries:['Nigeria','Ghana','Senegal',"Côte d'Ivoire",'Ivory Coast','Mali','Burkina Faso','Niger','Sierra Leone','Liberia','Guinea','Togo','Benin','Gambia'] },
  'east-africa':    { capitals:{ 'Nairobi':'Kenya','Addis Ababa':'Ethiopia','Dar es Salaam':'Tanzania','Dodoma':'Tanzania','Kampala':'Uganda','Kigali':'Rwanda','Bujumbura':'Burundi','Mogadishu':'Somalia','Juba':'South Sudan','Djibouti':'Djibouti','Asmara':'Eritrea' },
                      countries:['Kenya','Ethiopia','Tanzania','Uganda','Rwanda','Burundi','South Sudan','Somalia','Djibouti','Eritrea','Zanzibar'] },
  'central-africa': { capitals:{ 'Kinshasa':'DRC','Yaoundé':'Cameroon','Yaounde':'Cameroon','Libreville':'Gabon','Brazzaville':'Republic of Congo','Bangui':'CAR','N\'Djamena':'Chad','Luanda':'Angola' },
                      countries:['DRC','Democratic Republic of Congo','DR Congo','Cameroon','Chad','Central African Republic','Republic of Congo','Congo','Gabon','Equatorial Guinea','Angola'] },
  'southern-africa':{ capitals:{ 'Johannesburg':'South Africa','Pretoria':'South Africa','Cape Town':'South Africa','Harare':'Zimbabwe','Lusaka':'Zambia','Gaborone':'Botswana','Maputo':'Mozambique','Windhoek':'Namibia','Lilongwe':'Malawi' },
                      countries:['South Africa','Zimbabwe','Zambia','Botswana','Mozambique','Namibia','Malawi','Lesotho','Eswatini','Swaziland','Mauritius','Madagascar'] }
};
function wordRe(term){ return new RegExp('(^|[^a-z])'+String(term).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^a-z]|$)','i'); }

// Returns { region, country, city } or null. Capital match (most specific) wins and
// yields a city dateline; otherwise a country match sets region + country only.
export function guessGeo(text){
  const t = ' ' + String(text||'').toLowerCase() + ' ';
  for(const slug in REGION_GEO){
    const caps = REGION_GEO[slug].capitals;
    for(const city in caps){ if(wordRe(city).test(t)) return { region:slug, country:caps[city], city }; }
  }
  for(const slug in REGION_GEO){
    for(const c of REGION_GEO[slug].countries){ if(wordRe(c).test(t)) return { region:slug, country:c, city:null }; }
  }
  return null;
}
// World news is a narrow category: a story from an international outlet that
// has no African connection. A story from an African publisher is African by
// default even when it never names the country (a Nigerian paper writes
// "Bayelsa" or "Tinubu", not "Nigeria"), so only known global outlets qualify.
const GLOBAL_OUTLETS = /\b(al ?jazeera|bbc|reuters|associated press|ap news|afp|dw|deutsche welle|france ?24|rfi|the guardian|cnn|voa|voice of america|new york times|bloomberg|sky news|euronews)\b/i;
const AFRICAN_WORDS = /\b(africa|african|africans|sahel|sahara|saharan|maghreb|nigerian|kenyan|ghanaian|egyptian|ethiopian|ugandan|tanzanian|rwandan|zimbabwean|zambian|senegalese|moroccan|algerian|tunisian|libyan|sudanese|somali|malian|ivorian|cameroonian|angolan|mozambican|namibian|malawian|congolese|liberian|gambian|togolese|beninese|burundian|eritrean|mauritanian|gabonese|chadian|batswana|basotho)s?\b/i;
export function isWorldStory(label, text, region){
  if (region) return false;
  if (!GLOBAL_OUTLETS.test(String(label || ''))) return false;
  const t = String(text || '');
  return !AFRICAN_WORDS.test(t) && !guessGeo(t);
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

// ── Wire text cleanup (deterministic, free — improves readability before the
// optional AI polish pass in /api/polish, and stands alone if AI is off). ──

// Decode the handful of HTML entities that survive feed text.
export function decodeEntities(s){
  return String(s||'')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>')
    .replace(/&quot;/gi,'"')
    .replace(/&#0*39;|&#x0*27;|&apos;/gi,"'")
    .replace(/&#8217;|&#x2019;/gi,'’').replace(/&#8216;|&#x2018;/gi,'‘')
    .replace(/&#8220;|&#x201c;/gi,'“').replace(/&#8221;|&#x201d;/gi,'”')
    .replace(/&#8211;|&ndash;/gi,'–').replace(/&#8212;|&mdash;/gi,'—')
    .replace(/&hellip;|&#8230;/gi,'…')
    .replace(/&#(\d+);/g,(m,d)=>{ try{ return String.fromCodePoint(parseInt(d,10)); }catch(e){ return ''; } })
    .replace(/&#x([0-9a-f]+);/gi,(m,h)=>{ try{ return String.fromCodePoint(parseInt(h,16)); }catch(e){ return ''; } });
}

// Strip common RSS/blog boilerplate tails and share/subscribe cruft.
export function stripBoilerplate(s){
  let t = String(s||'');
  t = t.replace(/The post\b[\s\S]*?appeared first on[\s\S]*$/i,'');
  t = t.replace(/\b(continue reading|read more|read the full (story|article)|full story)\b[\s\S]*$/i,'');
  t = t.replace(/\[[….]{1,3}\]/g,'');                                  // [...] / […]
  t = t.replace(/\bshare this\b[:.]?[\s\S]*$/i,'');
  t = t.replace(/\b(subscribe|sign up)\b( to| for)?( our)? (newsletter|updates)\b[\s\S]*$/i,'');
  return t.replace(/\s+/g,' ').trim();
}

// Turn feed HTML (or plain text) into clean paragraphs.
export function htmlToParagraphs(html){
  let s = String(html||'');
  if(!s) return [];
  s = s.replace(/<\/(p|div|li|h[1-6]|blockquote)\s*>/gi,'\u2029')          // block ends → break
       .replace(/(<br\s*\/?>\s*){2,}/gi,'\u2029')                          // double <br> → break
       .replace(/<[^>]+>/g,' ');                                           // drop remaining tags
  s = decodeEntities(s);
  return s.split('\u2029')
    .map(p => stripBoilerplate(p.replace(/\s+/g,' ').replace(/\s+([.,;:!?])/g,'$1').trim()))
    .filter(p => p.length > 0);
}

// Trim to a length without cutting a word or sentence mid-way.
export function smartTrim(s, max){
  const t = String(s||'').replace(/\s+/g,' ').trim();
  if(t.length <= max) return t;
  const cut = t.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if(stop > max*0.6) return cut.slice(0, stop+1).trim();
  const sp = cut.lastIndexOf(' ');
  return (sp > 0 ? cut.slice(0, sp) : cut).trim() + '…';
}

// Strip a trailing " | Source" / " - Source" suffix that matches the feed's name.
export function cleanTitle(title, label){
  const t = decodeEntities(clean(title));
  const lab = clean(label);
  if(lab && !/^https?:/i.test(lab)){
    const esc = lab.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const re = new RegExp('\\s*[\\|\\u2013\\u2014-]\\s*' + esc + '\\s*$','i');
    const stripped = t.replace(re,'').trim();
    if(stripped.length >= 10) return stripped;
  }
  return t;
}

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
// Image URLs lifted out of feed HTML arrive attribute-encoded ("&amp;"); store the real URL.
function httpsify(u){
  return (typeof u === 'string' ? u : '').trim()
    .replace(/&(amp|#0*38|#x0*26);/gi, '&')
    .replace(/^http:\/\//i, 'https://');
}
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
    const title = tidyHeadline(cleanTitle(it.title, label));   // drop trailing " | Source", emoji, doubled prefix
    if(title.length < 10) continue;
    seen.add(link);

    // Prefer the fuller content:encoded when a feed ships it; fall back to the
    // snippet/summary. Deterministic cleanup (paragraphs, entities, boilerplate)
    // runs here for free; the optional AI pass (/api/polish) refines it later.
    const fullHtml = it.contentEncoded || it['content:encoded'] || it.content || '';
    let paras = htmlToParagraphs(fullHtml);
    if(!paras.length){
      const snip = stripBoilerplate(decodeEntities(clean(it.contentSnippet || it.summary || '')));
      if(snip) paras = [snip];
    }
    paras = paras.filter((para) => !isJunkText(para, title, true));     // styling/sponsor lines, repeated headline
    const standfirst = paras.length ? smartTrim(paras[0], 280) : '';
    const body = paras.length ? paras : ['Full story at source.'];
    const bodyText = body.join(' ');

    const vert = guessVertical(title, bodyText.slice(0, 600), src.hint_vertical);
    const def = VDEF[vert] || VDEF.front;
    const vlabel = VLABEL[vert] || vert;

    // Infer geography so the story lands on the coverage map + in its region archive.
    const geo = guessGeo(title + ' · ' + bodyText.slice(0, 1200));
    const dateline = (geo && geo.city) ? geo.city : 'Wire';
    const geoTags = geo ? [geo.country] : [];
    const publishedAt = it.isoDate
      || (it.pubDate ? new Date(it.pubDate).toISOString() : new Date().toISOString());
    const slug = 'wire-' + slugify(title).slice(0,56) + '-' + shortHash(link);

    // Relevant photo from the source feed (null → branded placeholder in the UI).
    const image = extractImage(it);
    const media = image ? { type:'image', src: image, caption: '', credit: label } : null;

    // Full front-end article object → lossless render via articles.payload.
    // Editorial gate: wire stories arrive as 'review' and wait in the Newsroom
    // Command Center for an editor to approve (→published) before the front page.
    const payload = {
      slug, vertical:vert, kicker: vlabel + ' · ' + label, headline:title,
      standfirst, byline: label, dateline,
      readingMin: Math.max(2, Math.ceil((bodyText.length || 200) / 900)),
      emoji: def.emoji, color: def.color, status:'review', publishedAt,
      tags: [label, 'Live wire', vlabel].concat(geoTags), body,
      region: geo ? geo.region : null,
      media, source:'rss', sourceUrl: link, sourceLabel: label
    };
    rows.push({
      slug, headline:title, dek: standfirst, body: body.join('\n\n'),
      vertical:vert, region: geo ? geo.region : null, author_slug:null, hero_image: image || null, video_url:null,
      status:'review', source:'rss', source_url: link, published_at: publishedAt, payload
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

// Re-file stored wire stories whose section the current classifier disagrees
// with, and blank summaries that are junk. Pure: returns the patch for one row,
// or null when nothing changes. Exported for tests.
export function correctionFor(row){
  const p = (row && typeof row.payload === 'object' && row.payload) || {};
  if (p.source !== 'rss') return null;
  const title = row.headline || p.headline || '';
  const bodyText = Array.isArray(p.body) ? p.body.join(' ') : String(p.body || '');
  const vert = guessVertical(title, bodyText.slice(0, 600));
  const dek = p.standfirst || row.dek || '';
  const junk = !!dek && isJunkText(dek, title);
  const tidy = tidyHeadline(title);
  const retitle = !!tidy && tidy.length >= 10 && tidy !== title;
  if (vert === (row.vertical || p.vertical) && !junk && !retitle) return null;
  const def = VDEF[vert] || VDEF.front, vlabel = VLABEL[vert] || vert;
  const label = p.sourceLabel || p.byline || '';
  const oldLabel = VLABEL[p.vertical] || '';
  const payload = Object.assign({}, p, {
    vertical: vert, emoji: def.emoji, color: def.color,
    kicker: vlabel + (label ? ' · ' + label : ''),
    tags: Array.isArray(p.tags) ? p.tags.map((t) => (t === oldLabel ? vlabel : t)) : p.tags
  });
  const patch = { vertical: vert, payload };
  if (junk) { payload.standfirst = ''; patch.dek = ''; }
  if (retitle) { payload.headline = tidy; patch.headline = tidy; }
  return patch;
}

const CORRECT_SCAN = 400;      // most recent wire stories examined per run
const CORRECT_MAX = 150;       // updates per run, to bound the function's time

async function correctStoredWire(admin){
  const { data, error } = await admin.from('articles')
    .select('id, headline, dek, vertical, payload')
    .eq('source', 'rss').order('published_at', { ascending: false }).limit(CORRECT_SCAN);
  if (error) { console.warn('[pull-wire] correction scan failed:', error.message); return { scanned: 0, corrected: 0 }; }
  let corrected = 0;
  for (const row of data || []) {
    if (corrected >= CORRECT_MAX) break;
    const patch = correctionFor(row);
    if (!patch) continue;
    const { error: upErr } = await admin.from('articles').update(patch).eq('id', row.id);
    if (upErr) { console.warn('[pull-wire] correction failed for', row.id, upErr.message); continue; }
    corrected++;
  }
  return { scanned: (data || []).length, corrected };
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

  // 4. Keep the archive honest: re-file recent stories the classifier now files differently.
  let corrections = { scanned: 0, corrected: 0 };
  try { corrections = await correctStoredWire(admin); } catch (e) { console.warn('[pull-wire] correction pass error:', (e && e.message) || e); }

  const okCount = report.filter(r => r.ok).length;
  const ms = Date.now() - started;
  console.log(`[pull-wire] done · inserted ${totalInserted} new · re-filed ${corrections.corrected}/${corrections.scanned} · ${okCount}/${sources.length} feed(s) ok · ${ms}ms`);
  return res.status(200).json({ ok:true, inserted: totalInserted, refiled: corrections.corrected, feeds: report, ms });
}
