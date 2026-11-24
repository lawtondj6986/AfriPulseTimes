import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
const NOW=Date.now(),H=3600000;
function mk(slug,h,v,i){return {slug,status:'published',published_at:new Date(NOW-i*H).toISOString(),payload:{slug,headline:h,vertical:v,standfirst:'A standfirst.',body:['Body.']}};}
const ROWS=[mk('n1','Nigeria expands rail network','front',1),mk('n2','Lagos markets rally on cocoa','markets',2),mk('n3','Oil spill in the Niger Delta','mining',3),
 mk('k1','Kenya and Nigeria sign trade pact','politics',4),mk('k2','Nairobi bourse posts record week','markets',5),
 mk('g1','Ghana parliament passes budget','politics',6),mk('x1','Global markets steady','markets',7)];
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
  await pg.addInitScript(l=>{ try{ localStorage.setItem('afripulse_welcomed','1'); localStorage.setItem('afripulse_home_asked','1'); if(l) localStorage.setItem('afripulse_lang',l); }catch(e){} },lang||'');
  await pg.goto(base+'#/pulse',{waitUntil:'networkidle'}); await pg.waitForTimeout(600); return {ctx,pg,errs}; }

{ const {ctx,pg,errs}=await open();
  const chips=await pg.evaluate(()=>[...document.querySelectorAll('#pulse-body .nations button')].map(b=>b.textContent.trim()));
  t('nations row: most-covered first, with flags and counts', chips.length===3 && chips[0].includes('🇳🇬') && chips[0].includes('Nigeria') && chips[0].endsWith('4') && chips[1].includes('Kenya') && chips[1].endsWith('2'), JSON.stringify(chips));
  await pg.click('#pulse-body .nations [data-c="KE"]'); await pg.waitForTimeout(250);
  const heads=await pg.evaluate(()=>[...document.querySelectorAll('#pulse-body a.card h3')].map(h=>h.textContent));
  t('tapping Kenya filters to Kenyan stories', heads.length===2 && heads.every(h=>/Kenya|Nairobi/.test(h)), JSON.stringify(heads));
  await pg.evaluate(()=>window.scrollTo(0,300)); await pg.waitForTimeout(100);
  await pg.screenshot({path:shot('nations-shot.png')});
  await pg.click('#pulse-body .pulsebar [data-r="west-africa"]'); await pg.waitForTimeout(250);
  t('choosing a region clears the nation filter', (await pg.locator('#pulse-body .nations button.on').count())===0);
  // story flags
  await pg.evaluate(()=>{ location.hash='#/story/k1'; }); await pg.waitForTimeout(300);
  const flags=await pg.evaluate(()=>[...document.querySelectorAll('#st-nations button')].map(b=>b.getAttribute('data-c')).sort());
  t('story shows both nations it covers', JSON.stringify(flags)==='["KE","NG"]', JSON.stringify(flags));
  await pg.click('#st-nations [data-c="NG"]'); await pg.waitForTimeout(350);
  const h=await pg.evaluate(()=>location.hash);
  const on=await pg.evaluate(()=>{ const b=document.querySelector('#pulse-body .nations button.on'); return b?b.getAttribute('data-c'):null; });
  const n=await pg.locator('#pulse-body a.card').count();
  t('tapping a flag opens Pulse on that nation', h==='#/pulse' && on==='NG' && n===4, h+' '+on+' '+n);
  await pg.evaluate(()=>{ location.hash='#/story/x1'; }); await pg.waitForTimeout(300);
  t('a story about no nation shows no flags', (await pg.locator('#st-nations').count())===0);
  t('no JS errors', errs.length===0, errs[0]||'');
  await ctx.close(); }

{ const {ctx,pg}=await open('fr');
  const chips=await pg.evaluate(()=>[...document.querySelectorAll('#pulse-body .nations button')].map(b=>b.textContent.trim()));
  const hd=await pg.locator('#pulse-body .nh').innerText();
  t('French country names + heading', chips[0].includes('Nigeria') && /nations dans/i.test(hd), chips[0]+' | '+hd);
  await ctx.close(); }

await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
