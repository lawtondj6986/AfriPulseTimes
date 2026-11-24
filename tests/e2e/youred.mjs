import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
const NOW=Date.now(), H=3600000, D=86400000;
function mk(slug,h,v,ts){return {slug,status:'published',published_at:new Date(ts).toISOString(),payload:{slug,headline:h,vertical:v,standfirst:'Dek '+slug+'.',body:['Body.']}};}
const ROWS=[mk('n1','Fresh: Accra summit opens','front',NOW-1*H),
 mk('n2','Fresh: Lagos bourse jumps','markets',NOW-2*H),
 mk('o1','Older: Nairobi rail report','markets',NOW-5*D),
 mk('o2','Older: Kigali fintech round','tech',NOW-6*D)];
const CFG=`const ROWS=${JSON.stringify(ROWS)};function q(){const p={select(){return p},eq(){return p},order(){return p},limit(){return p},then(r){return r({data:ROWS,error:null})}};return p}const m={from(){return q()}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const base=`http://127.0.0.1:${srv.address().port}/reader.html`;
const br=await chromium.launch(LAUNCH);
const R=[]; function t(n,ok,d){ R.push([n,ok,d]); }
const SEED=(o)=>{ try{ localStorage.setItem('afripulse_welcomed','1');
  if(o.seen && !localStorage.getItem('afripulse_seen')) localStorage.setItem('afripulse_seen',o.seen);
  if(o.lang) localStorage.setItem('afripulse_lang',o.lang); }catch(e){} };
const seen=JSON.stringify({p:0,c:NOW-2*D});   // last visit: two days ago

// returning reader
{ const ctx=await br.newContext({viewport:{width:390,height:800},deviceScaleFactor:2});
  const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(SEED,{seen});
  await pg.goto(base,{waitUntil:'networkidle'}); await pg.waitForTimeout(600);
  const badges=await pg.locator('#today-body .newb').count();
  const line=await pg.locator('.newline').innerText().catch(()=>'' );
  t('two NEW badges for stories since last visit', badges===2, badges);
  t('headline count line', line.includes('2 new since your last visit'), line);
  const oldHasBadge=await pg.evaluate(()=>[...document.querySelectorAll('#today-body a.card')].filter(c=>c.textContent.includes('Older')).some(c=>c.querySelector('.newb')));
  t('older stories carry no badge', !oldHasBadge);
  // read a new one + an old one
  await pg.evaluate(()=>{ location.hash='#/story/n2'; }); await pg.waitForTimeout(250);
  await pg.evaluate(()=>{ location.hash='#/story/o1'; }); await pg.waitForTimeout(250);
  await pg.evaluate(()=>{ location.hash='#/'; }); await pg.waitForTimeout(300);
  const line2=await pg.locator('.newline').innerText();
  const readCards=await pg.evaluate(()=>[...document.querySelectorAll('#today-body a.card.read')].map(c=>c.querySelector('h3').textContent));
  const n2badge=await pg.evaluate(()=>[...document.querySelectorAll('#today-body a.card')].filter(c=>c.textContent.includes('Lagos bourse')).some(c=>c.querySelector('.newb')));
  t('reading a story clears its badge + lowers the count', line2.includes('1 new') && !n2badge, line2);
  t('read stories get the ✓ mark', readCards.length===2 && (await pg.locator('#today-body .rd').count())===2, JSON.stringify(readCards));
  await pg.screenshot({path:shot('youred-shot.png'), clip:{x:0,y:440,width:390,height:360}});
  await pg.evaluate(()=>window.scrollTo(0,300)); await pg.waitForTimeout(100);
  await pg.screenshot({path:shot('youred-shot.png')});
  // reload within the same session keeps the baseline
  await pg.reload({waitUntil:'networkidle'}); await pg.waitForTimeout(500);
  t('reload in-session keeps what is new', (await pg.locator('.newline').innerText()).includes('1 new'));
  t('no JS errors', errs.length===0, errs[0]||'');
  await ctx.close(); }

// first-ever visit: nothing is "new", no nagging
{ const ctx=await br.newContext({viewport:{width:390,height:800}});
  const pg=await ctx.newPage();
  await pg.addInitScript(SEED,{});
  await pg.goto(base,{waitUntil:'networkidle'}); await pg.waitForTimeout(600);
  t('first visit shows no badges or count', (await pg.locator('.newb').count())===0 && (await pg.locator('.newline').count())===0);
  await ctx.close(); }

// French
{ const ctx=await br.newContext({viewport:{width:390,height:800}});
  const pg=await ctx.newPage();
  await pg.addInitScript(SEED,{seen,lang:'fr'});
  await pg.goto(base,{waitUntil:'networkidle'}); await pg.waitForTimeout(600);
  const b=await pg.locator('#today-body .newb').first().innerText();
  const l=await pg.locator('.newline').innerText();
  t('French badge + line', b==='NOUVEAU' && l.includes('nouveautés'), b+' · '+l);
  await ctx.close(); }

await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
