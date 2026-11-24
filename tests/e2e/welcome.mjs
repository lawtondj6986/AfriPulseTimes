import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
const CFG=`const m={from(){const p={select(){return p},eq(){return p},order(){return p},limit(){return p},then(r){return r({data:[],error:null})}};return p}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const base=`http://127.0.0.1:${srv.address().port}/reader.html`;
const br=await chromium.launch(LAUNCH);
const R=[]; function t(n,ok,d){ R.push([n,ok,d]); }

// 1–3 · Fresh visitor: overlay shows, choosing Français applies + persists; reload stays gone
{ const ctx=await br.newContext({viewport:{width:390,height:800},deviceScaleFactor:2});
  const pg=await ctx.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(base,{waitUntil:'networkidle'});
  await pg.waitForTimeout(300);
  const vis=await pg.locator('#welcome').isVisible();
  const btns=await pg.locator('#welcome [data-wlang]').count();
  t('fresh visit shows welcome with 5 languages', vis && btns===5, vis+' · '+btns);
  await pg.screenshot({path:shot('welcome-shot.png')});
  await pg.click('[data-wlang="fr"]');
  await pg.waitForTimeout(700);
  const gone=await pg.locator('#welcome').isHidden();
  const lang=await pg.evaluate(()=>document.documentElement.lang);
  const stored=await pg.evaluate(()=>[localStorage.getItem('afripulse_lang'),localStorage.getItem('afripulse_welcomed')]);
  const greet=await pg.locator('#greet').innerText();
  t('choosing Français applies instantly', gone && lang==='fr' && /Bonjour|après-midi|Bonsoir/.test(greet), lang+' · '+greet);
  t('choice persisted', stored[0]==='fr' && stored[1]==='1', String(stored));
  await pg.reload({waitUntil:'networkidle'}); await pg.waitForTimeout(300);
  t('second visit — never shown again', await pg.locator('#welcome').isHidden());
  t('no JS errors', errs.length===0, errs[0]||'');
  await ctx.close(); }

// 4 · Existing reader (language already chosen pre-feature): never interrupted
{ const ctx=await br.newContext({viewport:{width:390,height:800}});
  const pg=await ctx.newPage();
  await pg.addInitScript(()=>{ try{ localStorage.setItem('afripulse_lang','sw'); }catch(e){} });
  await pg.goto(base,{waitUntil:'networkidle'}); await pg.waitForTimeout(300);
  const hidden=await pg.locator('#welcome').isHidden();
  const backfilled=await pg.evaluate(()=>localStorage.getItem('afripulse_welcomed'));
  t('existing reader never sees it (flag backfilled)', hidden && backfilled==='1', hidden+' · '+backfilled);
  await ctx.close(); }

await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
