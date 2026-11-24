import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
function mk(slug,h,v,d){return {slug,status:'published',published_at:'2026-11-2'+d+'T08:00:00Z',payload:{slug,headline:h,vertical:v,standfirst:'The dek for '+slug+'.',body:['Body.']}};}
const ROWS=[mk('f1','COP31 ends without a climate deal','front','3'),
 mk('m1','Lagos markets rally on cocoa exports','markets','2'),
 mk('m2','Nairobi bourse posts a record week','markets','1'),
 mk('t1','Kigali fintech raises new round','tech','0')];
const CFG=`const ROWS=${JSON.stringify(ROWS)};function q(){const p={select(){return p},eq(){return p},order(){return p},limit(){return p},then(r){return r({data:ROWS,error:null})}};return p}const m={from(){return q()}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const br=await chromium.launch(LAUNCH);
const pg=await (await br.newContext({viewport:{width:390,height:800},deviceScaleFactor:2})).newPage();
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.addInitScript(()=>{ try{ localStorage.setItem('afripulse_welcomed','1'); }catch(e){} });
await pg.goto(`http://127.0.0.1:${srv.address().port}/reader.html`,{waitUntil:'networkidle'});
await pg.waitForTimeout(600);
const R=[]; function t(n,ok,d){ R.push([n,ok,d]); }

// hero = the front-page story, drawn big
const heroH=await pg.locator('.hero h2').innerText();
t('front-page story is the cover', heroH.includes('COP31'), heroH);
const heroDek=await pg.locator('.hero p').innerText();
t('cover carries the dek', heroDek.includes('dek for f1'), heroDek);

// hero not duplicated in the section lists
const dup=await pg.evaluate(()=>[...document.querySelectorAll('#today-body a.card h3')].map(h=>h.textContent));
t('cover story not repeated below', !dup.some(h=>h.includes('COP31')) && dup.length===3, JSON.stringify(dup));

// section chips for the rendered sections, localized labels
const chips=await pg.evaluate(()=>[...document.querySelectorAll('.secchips button')].map(b=>b.textContent));
t('chips for Markets + Tech', chips.length===2 && chips[0].includes('Markets') && chips[1].includes('Tech'), JSON.stringify(chips));

await pg.screenshot({path:shot('cover-shot.png'), clip:{x:0,y:0,width:390,height:800}});

// tapping a chip scrolls to the section
const y0=await pg.evaluate(()=>window.scrollY);
await pg.click('.secchips button[data-v="tech"]');
await pg.waitForTimeout(700);
const y1=await pg.evaluate(()=>window.scrollY);
const secVisible=await pg.evaluate(()=>{
  const el=document.getElementById('sec-tech'); const r=el.getBoundingClientRect();
  return r.top>=-10 && r.top<window.innerHeight;
});
t('chip tap scrolls to the section', y1>y0 && secVisible, y0+' → '+y1);

// search still bypasses the cover
await pg.evaluate(()=>{ window.scrollTo(0,0); });
await pg.fill('#q','Nairobi'); await pg.waitForTimeout(250);
t('search results have no hero', (await pg.locator('.hero').count())===0 && (await pg.locator('#today-body a.card').count())===1);
await pg.fill('#q',''); await pg.waitForTimeout(250);
t('cover returns when search clears', (await pg.locator('.hero').count())===1);

// cover opens the story
await pg.click('.hero'); await pg.waitForTimeout(300);
t('tapping the cover opens the story', (await pg.evaluate(()=>location.hash)).includes('f1'));

t('no JS errors', errs.length===0, errs[0]||'');
await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
