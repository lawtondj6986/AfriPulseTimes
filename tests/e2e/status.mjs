import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
function mk(slug,h,tr){return {slug,status:'published',published_at:new Date().toISOString(),translations:tr||null,payload:{slug,headline:h,vertical:'front',standfirst:'An English standfirst.',body:['English body.']}};}
const ROWS=[mk('e1','Nigeria expands rail network'),
 mk('t1','Kenya signs trade pact',{fr:{headline:'Le Kenya signe un pacte commercial',standfirst:'Un chapeau.',body:['Un paragraphe.']}})];
const CFG=`const ROWS=${JSON.stringify(ROWS)};function q(){const p={select(){return p},eq(){return p},order(){return p},limit(){return p},then(r){return r({data:ROWS,error:null})}};return p}const m={from(){return q()}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const base=`http://127.0.0.1:${srv.address().port}/reader.html`;
const br=await chromium.launch(LAUNCH);
const R=[]; function t(n,ok,d){ R.push([n,ok,d]); }
async function open(lang){ const ctx=await br.newContext({viewport:{width:390,height:800},deviceScaleFactor:2}); const pg=await ctx.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(l=>{ try{ localStorage.setItem('afripulse_welcomed','1'); localStorage.setItem('afripulse_home_asked','1'); if(l&&!localStorage.getItem('afripulse_lang')) localStorage.setItem('afripulse_lang',l); }catch(e){} },lang||'');
  await pg.goto(base,{waitUntil:'networkidle'}); await pg.waitForTimeout(600); return {ctx,pg,errs}; }

{ const {ctx,pg,errs}=await open();
  const u=await pg.locator('#upd').innerText();
  t('says how fresh the edition is', /^Updated now$/.test(u), u);
  await pg.screenshot({path:shot('status-shot.png'), clip:{x:0,y:0,width:390,height:110}});
  // three hours later, with the connection gone
  await pg.evaluate(()=>{ localStorage.setItem('afripulse_synced', String(Date.now()-3*3600000));
    Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false}); window.dispatchEvent(new Event('offline')); });
  await pg.waitForTimeout(150);
  const u2=await pg.locator('#upd').innerText();
  t('offline: says so, and how old the saved edition is', /Offline · Updated 3 hours ago/.test(u2), u2);
  await pg.evaluate(()=>{ Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>true}); location.hash='#/story/e1'; });
  await pg.waitForTimeout(300);
  t('English edition shows no translation note', (await pg.locator('.trnote').count())===0);
  t('no JS errors', errs.length===0, errs[0]||'');
  await ctx.close(); }

{ const {ctx,pg}=await open('fr');
  const u=await pg.locator('#upd').innerText();
  t('French freshness line, worded by the browser', /^Mis à jour maintenant$/.test(u), u);
  await pg.evaluate(()=>{ location.hash='#/story/e1'; }); await pg.waitForTimeout(300);
  t('untranslated story says it is shown in English', (await pg.locator('.trnote').innerText()).includes('Pas encore traduit en français'));
  await pg.evaluate(()=>{ location.hash='#/story/t1'; }); await pg.waitForTimeout(300);
  t('translated story carries no note', (await pg.locator('.trnote').count())===0 && (await pg.locator('.st-h').innerText()).includes('Le Kenya'));
  await ctx.close(); }

await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
