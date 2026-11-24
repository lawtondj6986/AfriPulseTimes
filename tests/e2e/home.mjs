import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
const NOW=Date.now(),H=3600000;
function mk(slug,h,v,region,i){return {slug,region,status:'published',published_at:new Date(NOW-i*H).toISOString(),payload:{slug,headline:h,vertical:v,standfirst:'Dek.',body:['Body.']}};}
const ROWS=[mk('f1','Continental summit closes','front','north-africa',1),
 mk('w1','Lagos port upgrade','markets','west-africa',2),mk('w2','Accra budget passes','politics','west-africa',3),
 mk('w3','Dakar startup week','tech','west-africa',4),mk('w4','Abuja rail opens','markets','west-africa',5),
 mk('w5','Freetown festival','culture','west-africa',6),
 mk('e1','Nairobi bourse record','markets','east-africa',7),mk('s1','Lusaka copper climbs','mining','southern-africa',8)];
const CFG=`const ROWS=${JSON.stringify(ROWS)};function q(){const p={select(){return p},eq(){return p},order(){return p},limit(){return p},then(r){return r({data:ROWS,error:null})}};return p}const m={from(){return q()}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const base=`http://127.0.0.1:${srv.address().port}/reader.html`;
const br=await chromium.launch(LAUNCH);
const R=[]; function t(n,ok,d){ R.push([n,ok,d]); }
async function open(extra){ const ctx=await br.newContext({viewport:{width:390,height:800},deviceScaleFactor:2}); const pg=await ctx.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(x=>{ try{ localStorage.setItem('afripulse_welcomed','1'); if(x&&x.lang&&!localStorage.getItem('afripulse_lang')) localStorage.setItem('afripulse_lang',x.lang); }catch(e){} },extra||{});
  await pg.goto(base,{waitUntil:'networkidle'}); await pg.waitForTimeout(600); return {ctx,pg,errs}; }

{ const {ctx,pg,errs}=await open();
  t('asks where home is, five regions + not now', (await pg.locator('.homeask [data-r]').count())===5 && (await pg.locator('.homeask [data-skip]').count())===1);
  t('no Near you before choosing', (await pg.locator('#sec-near').count())===0);
  await pg.click('.homeask [data-r="west-africa"]'); await pg.waitForTimeout(250);
  const head=await pg.locator('#sec-near').innerText();
  const nearCards=await pg.evaluate(()=>{ const c=document.querySelector('#sec-near+.cards'); return [...c.querySelectorAll('h3')].map(h=>h.textContent); });
  t('Near you section appears, labelled', /near you/i.test(head) && /west africa/i.test(head), head);
  t('up to four stories, all from home', nearCards.length===4 && nearCards.every(h=>/Lagos|Accra|Dakar|Abuja/.test(h)), JSON.stringify(nearCards));
  const all=await pg.evaluate(()=>[...document.querySelectorAll('#today-body a.card h3')].map(h=>h.textContent));
  t('no story appears twice', new Set(all).size===all.length && all.includes('Freetown festival'), JSON.stringify(all));
  t('question retired after answering', (await pg.locator('.homeask').count())===0);
  await pg.evaluate(()=>window.scrollTo(0,430)); await pg.waitForTimeout(100);
  await pg.screenshot({path:shot('home-shot.png')});
  // Me: add East Africa too
  await pg.evaluate(()=>{ location.hash='#/me'; }); await pg.waitForTimeout(300);
  t('Me shows West Africa selected', (await pg.locator('#me-home button.on').count())===1);
  await pg.click('#me-home [data-r="east-africa"]'); await pg.waitForTimeout(200);
  await pg.evaluate(()=>{ location.hash='#/'; }); await pg.waitForTimeout(300);
  const head2=await pg.locator('#sec-near').innerText();
  t('two home regions both named', /west africa/i.test(head2) && /east africa/i.test(head2), head2);
  // clear both in Me → section gone, and no nagging
  await pg.evaluate(()=>{ location.hash='#/me'; }); await pg.waitForTimeout(300);
  await pg.click('#me-home [data-r="east-africa"]'); await pg.waitForTimeout(150);
  await pg.click('#me-home [data-r="west-africa"]'); await pg.waitForTimeout(150);
  await pg.evaluate(()=>{ location.hash='#/'; }); await pg.waitForTimeout(300);
  t('clearing home removes the section without re-asking', (await pg.locator('#sec-near').count())===0 && (await pg.locator('.homeask').count())===0);
  t('no JS errors', errs.length===0, errs[0]||'');
  await ctx.close(); }

{ const {ctx,pg}=await open();
  await pg.click('.homeask [data-skip]'); await pg.waitForTimeout(200);
  await pg.reload({waitUntil:'networkidle'}); await pg.waitForTimeout(500);
  t('"Not now" is remembered across reloads', (await pg.locator('.homeask').count())===0 && (await pg.locator('#sec-near').count())===0);
  await ctx.close(); }

{ const {ctx,pg}=await open({lang:'fr'});
  const q=await pg.locator('.homeask .hq').innerText();
  await pg.click('.homeask [data-r="west-africa"]'); await pg.waitForTimeout(250);
  const head=await pg.locator('#sec-near').innerText();
  t('French question + section', q.includes('région') && /près de chez vous/i.test(head) && /Afrique de l’Ouest/i.test(head), q+' | '+head);
  await ctx.close(); }

await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
