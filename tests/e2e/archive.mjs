import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
const NOW=Date.now(),H=3600000;
const DB=Array.from({length:65},(_,k)=>{const i=k+1; const h=(i===50?'Zanzibar ferry service resumes':i===63?'Zanzibar spice exports climb':'Story number '+i+' from the continent');
  return {slug:'s'+i,status:'published',published_at:new Date(NOW-i*H).toISOString(),payload:{slug:'s'+i,headline:h,vertical:i%2?'markets':'politics',standfirst:'Dek '+i+'.',body:['Body '+i+'.']}};});
// A mock that honours limit, lt(published_at), ilike(headline) and eq(slug).
const CFG=`const DB=${JSON.stringify(DB)};window.__q=[];
function q(){const f={};const p={select(){return p},eq(c,v){f['eq_'+c]=v;return p},lt(c,v){f.lt=v;return p},ilike(c,v){f.ilike=[c,v];return p},order(){return p},limit(n){f.limit=n;return p},
 then(r){ let rows=DB.slice(); window.__q.push(JSON.parse(JSON.stringify(f)));
   if(f.eq_slug) rows=rows.filter(x=>x.slug===f.eq_slug);
   if(f.lt) rows=rows.filter(x=>x.published_at<f.lt);
   if(f.ilike){ const t=f.ilike[1].replace(/%/g,'').toLowerCase(); rows=rows.filter(x=>x.payload.headline.toLowerCase().includes(t)); }
   if(f.limit) rows=rows.slice(0,f.limit); return r({data:rows,error:null}); }};return p}
const m={from(){return q()}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const br=await chromium.launch(LAUNCH);
const ctx=await br.newContext({viewport:{width:390,height:800},deviceScaleFactor:2}); const pg=await ctx.newPage();
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.addInitScript(()=>{ try{ localStorage.setItem('afripulse_welcomed','1'); localStorage.setItem('afripulse_home_asked','1'); localStorage.setItem('afripulse_subscribed','1'); }catch(e){} });
await pg.goto(`http://127.0.0.1:${srv.address().port}/reader.html`,{waitUntil:'networkidle'}); await pg.waitForTimeout(700);
const R=[]; function t(n,ok,d){ R.push([n,ok,d]); }
const count=()=>pg.evaluate(()=>document.querySelectorAll('#today-body a.card, #today-body a.hero').length);

t('edition shows the latest 40', (await count())===40, await count());
t('"Load earlier stories" offered', (await pg.locator('#more-btn').count())===1);
await pg.click('#more-btn'); await pg.waitForTimeout(400);
const earlier=await pg.evaluate(()=>[...document.querySelectorAll('#sec-earlier + .cards h3')].map(h=>h.textContent));
t('next page arrives under "Earlier", oldest-edition onward, no repeats', earlier.length===20 && earlier[0].includes('number 41') && (await count())===60, earlier.length+' '+earlier[0]);
await pg.click('#more-btn'); await pg.waitForTimeout(400);
t('last partial page loads and the button retires', (await count())===65 && (await pg.locator('#more-btn').count())===0, await count());
// an archive story opens instantly (no extra single-story request)
const q0=await pg.evaluate(()=>window.__q.length);
await pg.evaluate(()=>{ location.hash='#/story/s58'; }); await pg.waitForTimeout(300);
t('earlier story opens with no extra request', (await pg.locator('#story-body').innerText()).includes('number 58') && (await pg.evaluate(()=>window.__q.length))===q0);
await pg.evaluate(()=>{ location.hash='#/'; }); await pg.waitForTimeout(300);
await ctx.close();

// archive search from a fresh session (nothing older loaded)
{ const ctx2=await br.newContext({viewport:{width:390,height:800},deviceScaleFactor:2}); const p2=await ctx2.newPage();
  p2.on('pageerror',e=>errs.push(e.message));
  await p2.addInitScript(()=>{ try{ localStorage.setItem('afripulse_welcomed','1'); localStorage.setItem('afripulse_home_asked','1'); }catch(e){} });
  await p2.goto(`http://127.0.0.1:${srv.address().port}/reader.html`,{waitUntil:'networkidle'}); await p2.waitForTimeout(700);
  await p2.fill('#q','Zanzibar'); await p2.waitForTimeout(250);
  t('no match in today’s edition, archive search offered', (await p2.locator('#today-body').innerText()).includes('Search the archive for “Zanzibar”'));
  await p2.click('#arch-go'); await p2.waitForTimeout(400);
  const res=await p2.evaluate(()=>[...document.querySelectorAll('#arch-h + .cards h3')].map(h=>h.textContent));
  t('archive returns both older matches', res.length===2 && res.every(h=>h.includes('Zanzibar')), JSON.stringify(res));
  await p2.screenshot({path:shot('archive-shot.png'), clip:{x:0,y:200,width:390,height:600}});
  await p2.click('#arch-h + .cards a.card'); await p2.waitForTimeout(300);
  t('an archive result opens', (await p2.locator('#story-body').innerText()).includes('Zanzibar'));
  await p2.evaluate(()=>{ location.hash='#/'; }); await p2.waitForTimeout(250);
  await p2.fill('#q','zz%_q'); await p2.waitForTimeout(250);
  await p2.click('#arch-go'); await p2.waitForTimeout(400);
  const last=await p2.evaluate(()=>window.__q[window.__q.length-1]);
  t('wildcard characters in a query are neutralised', last.ilike && !/[_]/.test(last.ilike[1]) && (last.ilike[1].match(/%/g)||[]).length===2 && (await p2.locator('#today-body').innerText()).includes('Nothing in the archive'), JSON.stringify(last));
  await p2.fill('#q','ab'); await p2.waitForTimeout(250);
  t('queries under three letters do not offer archive search', (await p2.locator('#arch-go').count())===0);
  await ctx2.close(); }

t('no JS errors', errs.length===0, errs[0]||'');
await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
