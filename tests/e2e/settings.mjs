import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
function mk(slug,h,v,i){return {slug,status:'published',published_at:new Date(Date.now()-i*3600000).toISOString(),payload:{slug,headline:h,vertical:v,standfirst:'Dek.',body:['Body.']}};}
const ROWS=[mk('f1','Continental summit closes','front',1),mk('p1','Accra budget passes','politics',2),mk('m1','Lagos bourse jumps','markets',3),mk('t1','Kigali fintech round','tech',4),mk('s1','Dakar derby thriller','sports',5)];
const CFG=`const ROWS=${JSON.stringify(ROWS)};function q(){const p={select(){return p},eq(){return p},order(){return p},limit(){return p},then(r){return r({data:ROWS,error:null})}};return p}const m={from(){return q()}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const base=`http://127.0.0.1:${srv.address().port}/reader.html`;
const br=await chromium.launch(LAUNCH);
const R=[]; function t(n,ok,d){ R.push([n,ok,d]); }
const STUB=()=>{ window.__rates=[];
  try{ localStorage.setItem('afripulse_welcomed','1'); localStorage.setItem('afripulse_home_asked','1'); }catch(e){}
  class U{ constructor(tx){ this.text=tx; this.onend=null; } }
  Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:U});
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{ getVoices(){ return []; }, cancel(){}, pause(){}, resume(){},
    speak(u){ window.__rates.push(u.rate); } }}); };
const ctx=await br.newContext({viewport:{width:390,height:800},deviceScaleFactor:2}); const pg=await ctx.newPage();
const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
await pg.addInitScript(STUB);
await pg.goto(base,{waitUntil:'networkidle'}); await pg.waitForTimeout(600);
const sections=()=>pg.evaluate(()=>[...document.querySelectorAll('#today-body .h2[id^="sec-"]')].map(h=>h.id.replace('sec-','')));
const speak=async()=>{ await pg.evaluate(()=>{ window.__rates=[]; location.hash='#/story/p1'; }); await pg.waitForTimeout(300); await pg.click('#read-btn'); await pg.waitForTimeout(100);
  const r=await pg.evaluate(()=>window.__rates[0]); await pg.click('#read-btn'); return r; };

t('sections start in the paper’s own order', JSON.stringify(await sections())==='["politics","markets","tech","sports"]', JSON.stringify(await sections()));
t('default read-aloud speed', Math.abs((await speak())-0.98)<0.001);

await pg.evaluate(()=>{ location.hash='#/me'; }); await pg.waitForTimeout(300);
await pg.click('#me-favs [data-v="tech"]'); await pg.waitForTimeout(150);
await pg.click('#me-favs [data-v="sports"]'); await pg.waitForTimeout(150);
await pg.click('#seg-speed [data-sp="s"]'); await pg.waitForTimeout(150);
await pg.locator('#me-favs').scrollIntoViewIfNeeded(); await pg.screenshot({path:shot('settings-shot.png')});
t('choices show as selected', (await pg.locator('#me-favs button.on').count())===2 && (await pg.locator('#seg-speed button.on').getAttribute('data-sp'))==='s');
await pg.evaluate(()=>{ location.hash='#/'; }); await pg.waitForTimeout(300);
t('favourite sections lead Today, in the order chosen', JSON.stringify(await sections())==='["tech","sports","politics","markets"]', JSON.stringify(await sections()));
t('“Slower” slows the voice', Math.abs((await speak())-0.8)<0.001);

await pg.reload({waitUntil:'networkidle'}); await pg.waitForTimeout(500);
await pg.evaluate(()=>{ location.hash='#/'; }); await pg.waitForTimeout(300);
t('both choices survive a reload', JSON.stringify(await sections())==='["tech","sports","politics","markets"]' && Math.abs((await speak())-0.8)<0.001);

await pg.evaluate(()=>{ location.hash='#/me'; }); await pg.waitForTimeout(300);
await pg.click('#me-favs [data-v="tech"]'); await pg.waitForTimeout(150);
await pg.click('#seg-speed [data-sp="f"]'); await pg.waitForTimeout(150);
await pg.evaluate(()=>{ location.hash='#/'; }); await pg.waitForTimeout(300);
t('un-favouriting returns a section to its usual place', JSON.stringify(await sections())==='["sports","politics","markets","tech"]', JSON.stringify(await sections()));
t('“Faster” speeds the voice', Math.abs((await speak())-1.2)<0.001);
t('no JS errors', errs.length===0, errs[0]||'');
await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
