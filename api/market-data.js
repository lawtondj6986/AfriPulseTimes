// AfriPulse Times — live market data (African FX) for the news ticker.
//
// Runs server-side so the browser needs no API key and hits no CORS wall, and so
// a flaky upstream is absorbed here: if this returns nothing, the frontend keeps
// showing its curated fallback values, so the ticker can never break on stage.
//
// Source: fawazahmed0 currency-api (free, no key, daily rates), with a mirror
// fallback URL. Returns day-over-day change when yesterday's rates are available.
//
// GET /api/market-data → { ok, updated, source, fx: [ {n,v,c,d}, ... ] }

const CURRENCIES = [
  { code:'ngn', pair:'USD/NGN' },  // Nigeria
  { code:'kes', pair:'USD/KES' },  // Kenya
  { code:'zar', pair:'USD/ZAR' },  // South Africa
  { code:'egp', pair:'USD/EGP' },  // Egypt
  { code:'ghs', pair:'USD/GHS' },  // Ghana
  { code:'mad', pair:'USD/MAD' },  // Morocco
  { code:'xof', pair:'USD/XOF' },  // West African CFA franc
  { code:'etb', pair:'USD/ETB' }   // Ethiopia
];

const LATEST_URLS = [
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json',
  'https://latest.currency-api.pages.dev/v1/currencies/usd.min.json'
];
function datedUrls(ymd){
  return [
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@' + ymd + '/v1/currencies/usd.min.json',
    'https://' + ymd + '.currency-api.pages.dev/v1/currencies/usd.min.json'
  ];
}

// Try each URL in order; return the first JSON that parses, else null.
async function fetchJson(urls, timeoutMs){
  for(const url of urls){
    try{
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs || 4000);
      const res = await fetch(url, { signal: ctrl.signal, headers:{ 'Accept':'application/json' } });
      clearTimeout(timer);
      if(res.ok) return await res.json();
    }catch(e){ /* network/timeout — try next URL */ }
  }
  return null;
}

function fmtRate(r){
  if(!(r > 0)) return null;
  if(r >= 100) return Math.round(r).toLocaleString('en-US');   // e.g. 1,543
  return r.toFixed(2);                                          // e.g. 18.32
}

// Build the ticker's FX items from a latest-rate map, plus an optional previous
// map for day-over-day change. Shape matches the frontend's commodity items.
// Exported for tests.
export function buildFx(today, prev){
  const out = [];
  for(const cur of CURRENCIES){
    const r = today ? today[cur.code] : null;
    const v = fmtRate(r);
    if(v == null) continue;
    let c = '—', d = 'flat';
    const p = prev && prev[cur.code];
    if(p > 0 && r > 0){
      const pct = ((r - p) / p) * 100;
      if(pct > 0.005){ d = 'up';   c = '▲ ' + pct.toFixed(2) + '%'; }
      else if(pct < -0.005){ d = 'dn'; c = '▼ ' + Math.abs(pct).toFixed(2) + '%'; }
      else { d = 'flat'; c = '· 0.00%'; }
    }
    out.push({ n: cur.pair, v: v, c: c, d: d });
  }
  return out;
}

function yesterdayUTC(){
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default async function handler(req, res){
  const latest = await fetchJson(LATEST_URLS, 4000);
  if(!latest || !latest.usd){
    // Short cache so we retry soon; frontend keeps its fallback meanwhile.
    res.setHeader('Cache-Control', 'public, s-maxage=300');
    return res.status(200).json({ ok:false, error:'upstream unavailable' });
  }

  const prevDoc = await fetchJson(datedUrls(yesterdayUTC()), 3500);
  const prev = prevDoc && prevDoc.usd ? prevDoc.usd : null;

  const fx = buildFx(latest.usd, prev);
  // Edge-cache 30 min (rates are daily); serve stale up to an hour while revalidating.
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
  return res.status(200).json({
    ok: fx.length > 0,
    updated: latest.date || null,
    source: 'currency-api',
    fx
  });
}
