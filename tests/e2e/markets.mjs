import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
function mk(slug,h,v){return {slug,status:'published',published_at:new Date().toISOString(),payload:{slug,headline:h,vertical:v,standfirst:'Dek.',body:['Body.']}};}
const ROWS=[mk('a1','Accra summit opens','front'),mk('a2','Lagos bourse jumps','markets')];
const CFG=`const ROWS=${JSON.stringify(ROWS)};function q(){const p={select(){return p},eq(){return p},order(){return p},limit(){return p},then(r){return r({data:ROWS,error:null})}};return p}const m={from(){return q()}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const FXDATA={ok:true,updated:'2026-11-23',source:'currency-api',fx:[
 {n:'USD/NGN',v:'1,367',c:'▲ 0.21%',d:'up'},{n:'USD/KES',v:'130',c:'· 0.00%',d:'flat'},{n:'USD/ZAR',v:'17.41',c:'▼ 0.10%',d:'down'},
 {n:'USD/EGP',v:'54.42',c:'· 0.00%',d:'flat'},{n:'USD/GHS',v:'11.80',c:'· 0.00%',d:'flat'},{n:'USD/MAD',v:'9.97',c:'· 0.00%',d:'flat'},
 {n:'USD/XOF',v:'596',c:'· 0.00%',d:'flat'},{n:'USD/ETB',v:'164',c:'· 0.00%',d:'flat'}]};
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const base=`http://127.0.0.1:${srv.address().port}/reader.html`;
const br=await chromium.launch(LAUNCH);
const R=[]; function t(n,ok,d){ R.push([n,ok,d]); }
async function open(o){ o=o||{}; const ctx=o.ctx||await br.newContext({viewport:{width:390,height:800},deviceScaleFactor:2}); const pg=await ctx.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); const hits={n:0};
  await pg.route('**/api/market-data', route=>{ hits.n++;
    if(o.mode==='down') return route.abort();
    if(o.mode==='junk') return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"fx":[{"n":5}]}'});
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(FXDATA)}); });
  await pg.addInitScript(x=>{ try{ localStorage.setItem('afripulse_welcomed','1'); localStorage.setItem('afripulse_home_asked','1');
    if(x.home&&!localStorage.getItem('afripulse_home')) localStorage.setItem('afripulse_home',x.home); if(x.lang&&!localStorage.getItem('afripulse_lang')) localStorage.setItem('afripulse_lang',x.lang); }catch(e){} },{home:o.home||'',lang:o.lang||''});
  await pg.goto(base,{waitUntil:'networkidle'}); await pg.waitForTimeout(700); return {ctx,pg,errs,hits}; }
const pairs=pg=>pg.evaluate(()=>[...document.querySelectorAll('.fx .fxi b')].map(b=>b.textContent));

{ const {ctx,pg,errs,hits}=await open();
  const p=await pairs(pg), txt=await pg.locator('.fx').innerText();
  t('eight currency pairs shown under the cover', p.length===8 && p[0]==='USD/NGN' && txt.includes('1,367') && txt.includes('▲ 0.21%'), JSON.stringify(p));
  t('dated honestly', /as of 23 Nov/.test(txt), txt.slice(-40));
  await pg.evaluate(()=>document.querySelector('.fx').scrollIntoView({block:'center'})); await pg.waitForTimeout(100);
  await pg.screenshot({path:shot('markets-shot.png')});
  // second visit inside three hours: served from the device, with the service unreachable
  const n0=hits.n;
  const again=await open({ctx,mode:'down'});
  t('cached rates are reused with no new request', (await pairs(again.pg)).length===8 && again.hits.n===0 && hits.n===n0);
  t('no JS errors', errs.length===0 && again.errs.length===0, errs[0]||again.errs[0]||'');
  await ctx.close(); }

{ const {ctx,pg}=await open({home:'["east-africa"]'});
  const p=await pairs(pg);
  t('home region’s currencies come first', p[0]==='USD/KES' && p[1]==='USD/ETB', JSON.stringify(p));
  await ctx.close(); }

{ const {ctx,pg,errs}=await open({mode:'junk'});
  t('malformed data is rejected: no strip, no error', (await pg.locator('.fx').count())===0 && errs.length===0);
  await ctx.close(); }

{ const {ctx,pg,errs}=await open({mode:'down'});
  t('service down and nothing cached: no strip, no error', (await pg.locator('.fx').count())===0 && errs.length===0);
  await ctx.close(); }

{ const {ctx,pg}=await open({lang:'fr'});
  t('French label', (await pg.locator('.fx .fxl').innerText()).toLowerCase().includes('taux de change'));
  await ctx.close(); }

await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
