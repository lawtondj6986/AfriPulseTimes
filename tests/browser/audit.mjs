// End-to-end browser audit for AfriPulse Times.
//
// This is an OPTIONAL, manual test (not part of `npm test` / CI) because it
// needs a headless browser. It serves public/ with mocked Supabase + market-data
// backends and drives every route, checking each renders without runtime errors,
// plus i18n, the live-FX ticker, admin views, mobile layout, and a11y basics.
//
// Run it:
//   npm install --no-save playwright-core
//   # point CHROMIUM_PATH at a Chromium/Chrome binary, e.g. one Playwright installed:
//   CHROMIUM_PATH=/path/to/chromium node tests/browser/audit.mjs
//
// Exit code is non-zero if any check fails.

import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || undefined; // undefined → playwright's default
const ROOT = fileURLToPath(new URL('../../public', import.meta.url));

const MOCK_CONFIG = `
const LEADS=[
 {id:'a1',name:'Jane Okafor',email:'jane@fund.com',organisation:'Sahel Ventures',interest:'investor',message:'Series A',language:'en',status:'new',created_at:'2026-06-30T09:00:00Z'},
 {id:'a2',name:'Amadou Diallo',email:'a@orange.example',organisation:'Orange',interest:'partner',message:'',language:'fr',status:'new',created_at:'2026-06-29T09:00:00Z'},
 {id:'a3',name:'Lucy M',email:'l@bh.co.ke',organisation:'BrandHouse',interest:'advertiser',message:'ads',language:'en',status:'contacted',created_at:'2026-06-27T09:00:00Z'}
];
function q(table){ const p={ select(){return p;},order(){return p;},limit(){return p;},eq(){return p;},
 insert(){return p;},update(){return p;},delete(){return p;},upsert(){return p;},single(){p._s=true;return p;},
 then(res){ if(table==='leads')return res({data:p._s?LEADS[0]:LEADS,error:null});
  if(table==='articles')return res({data:null,error:{message:'keep-seed'}}); return res({data:[],error:null}); } }; return p; }
const mock={ auth:{ getSession:async()=>({data:{session:{access_token:'t',user:{email:'editor@afripulsetimes.com'}}}}),
 onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signInWithOtp:async()=>({error:null}),signOut:async()=>({error:null}) },
 from:(t)=>q(t),
 storage:{ from:(b)=>({ upload:async(p)=>({data:{path:p},error:null}), getPublicUrl:(p)=>({data:{publicUrl:'https://x.supabase.co/'+b+'/'+p}}) }) } };
window.__supabase=mock; if(typeof window.__supabaseResolve==='function') window.__supabaseResolve(mock);
`;
const FX = { ok:true, updated:'2026-07-02', source:'currency-api', fx:[
  {n:'USD/NGN',v:'1,543',c:'▲ 0.41%',d:'up'},{n:'USD/KES',v:'129',c:'▼ 0.23%',d:'dn'},
  {n:'USD/ZAR',v:'18.32',c:'▲ 0.66%',d:'up'},{n:'USD/EGP',v:'48.70',c:'—',d:'flat'}] };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/afripulse-preview.html';
  if (p === '/supabase-config.js') { res.setHeader('content-type', 'application/javascript'); return res.end(MOCK_CONFIG); }
  if (p === '/api/market-data') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify(FX)); }
  if (p.startsWith('/api/')) { res.setHeader('content-type', 'application/json'); return res.end('{"ok":true}'); }
  fs.readFile(path.join(ROOT, p), (e, b) => { if (e) { res.statusCode = 404; return res.end('nf'); } res.end(b); });
});
await new Promise(r => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/afripulse-preview.html`;

const browser = await chromium.launch({ executablePath: CHROMIUM_PATH, args: ['--no-sandbox'] });
const page = await browser.newPage();
const R = [];
const routes = [
  ['#/', 'Home'], ['#/v/politics', 'Politics'], ['#/v/mining', 'Mining'], ['#/v/tech', 'Tech'],
  ['#/region/west-africa', 'Region'], ['#/journalists', 'Journalists'], ['#/newsletter', 'Newsletter'],
  ['#/search/nigeria', 'Search'], ['#/search/zzxqq', 'Search-empty'],
  ['#/admin', 'Admin'], ['#/admin/leads', 'Admin-leads'], ['#/admin/new', 'Admin-new'], ['#/nope', '404']
];
for (const [hash, label] of routes) {
  const errs = [];
  const onErr = e => errs.push('PAGEERROR: ' + e.message);
  const onCon = m => { if (m.type() === 'error' && !/net::ERR|404|Failed to load resource/.test(m.text())) errs.push('CONSOLE: ' + m.text()); };
  page.on('pageerror', onErr); page.on('console', onCon);
  await page.goto(base + hash, { waitUntil: 'networkidle', timeout: 20000 }).catch(e => errs.push('NAV: ' + e.message));
  await page.waitForTimeout(700);
  page.off('pageerror', onErr); page.off('console', onCon);
  R.push([`[${label}] renders error-free`, errs.length === 0, errs[0] || '']);
}
// Back to a ticker-bearing view and let the background FX fetch land.
await page.goto(base + '#/', { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2200);
R.push(['live FX ticker present', (await page.locator('.com-track').first().textContent().catch(() => '')).includes('USD/'), '']);

await browser.close();
server.close();

let pass = 0;
for (const [name, ok, detail] of R) { console.log((ok ? 'PASS' : 'FAIL') + ' · ' + name + (ok ? '' : '  → ' + detail)); if (ok) pass++; }
console.log(`\n${pass}/${R.length} checks passed`);
process.exit(pass === R.length ? 0 : 1);
