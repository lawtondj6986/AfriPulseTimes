import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
const NOW=Date.now(),H=3600000;
function mk(slug,h,v,i,tr){return {slug,status:'published',published_at:new Date(NOW-i*H).toISOString(),translations:tr||null,payload:{slug,headline:h,vertical:v,standfirst:'An English standfirst.',body:['English body.']}};}
const ROWS=[mk('e1','Nigeria expands rail network','front',1),
 mk('t1','Kenya signs trade pact','politics',2,{ar:{headline:'كينيا توقع اتفاقية تجارية',standfirst:'ملخص عربي.',body:['فقرة عربية.']}})];
const CFG=`const ROWS=${JSON.stringify(ROWS)};function q(){const p={select(){return p},eq(){return p},order(){return p},limit(){return p},then(r){return r({data:ROWS,error:null})}};return p}const m={from(){return q()}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const base=`http://127.0.0.1:${srv.address().port}/reader.html`;
const br=await chromium.launch(LAUNCH);
const R=[]; function t(n,ok,d){ R.push([n,ok,d]); }

// Arabic interface: English text keeps left-to-right order, Arabic text right-to-left
{ const ctx=await br.newContext({viewport:{width:390,height:800},deviceScaleFactor:2}); const pg=await ctx.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{ try{ localStorage.setItem('afripulse_welcomed','1'); localStorage.setItem('afripulse_home_asked','1'); localStorage.setItem('afripulse_lang','ar'); }catch(e){} });
  await pg.goto(base,{waitUntil:'networkidle'}); await pg.waitForTimeout(600);
  const dirs=await pg.evaluate(()=>[...document.querySelectorAll('#today-body h2[dir],#today-body h3[dir]')].map(h=>[h.textContent.slice(0,12),getComputedStyle(h).direction,getComputedStyle(h).textAlign]));
  const en=dirs.find(d=>/Nigeria/.test(d[0])), ar=dirs.find(d=>/كينيا/.test(d[0]));
  t('English headline flows left-to-right inside the Arabic page', en && en[1]==='ltr', JSON.stringify(dirs));
  t('Arabic headline flows right-to-left', ar && ar[1]==='rtl', JSON.stringify(dirs));
  await pg.screenshot({path:shot('a11y-shot.png'), clip:{x:0,y:330,width:390,height:470}});
  await pg.evaluate(()=>{ location.hash='#/story/e1'; }); await pg.waitForTimeout(300);
  t('untranslated story is marked lang="en"', (await pg.locator('.st-h').getAttribute('lang'))==='en' && (await pg.locator('.st-body').getAttribute('lang'))==='en');
  await pg.evaluate(()=>{ location.hash='#/story/t1'; }); await pg.waitForTimeout(300);
  t('translated story carries no English marker', (await pg.locator('.st-h').getAttribute('lang'))===null);
  t('no JS errors (ar)', errs.length===0, errs[0]||'');
  await ctx.close(); }

// roles, labels, keyboard, reduced motion
{ const ctx=await br.newContext({viewport:{width:390,height:800},reducedMotion:'reduce'}); const pg=await ctx.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(base,{waitUntil:'networkidle'}); await pg.waitForTimeout(500);
  const w=await pg.evaluate(()=>{ const el=document.getElementById('welcome'); return [el.getAttribute('role'),el.getAttribute('aria-modal'),document.activeElement&&document.activeElement.getAttribute('data-wlang')]; });
  t('welcome is a labelled dialog and takes focus', w[0]==='dialog' && w[1]==='true' && w[2]==='en', JSON.stringify(w));
  const anim=await pg.evaluate(()=>getComputedStyle(document.querySelector('.w-pulse')).animationName);
  t('reduced motion: no pulse animation', anim==='none', anim);
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(700);
  t('keyboard alone gets through the welcome', await pg.locator('#welcome').isHidden());
  const misc=await pg.evaluate(()=>[document.getElementById('toast').getAttribute('role'),document.getElementById('readbar').getAttribute('aria-hidden'),
    [...document.querySelectorAll('.tab .ic')].every(i=>i.getAttribute('aria-hidden')==='true'),document.getElementById('q').getAttribute('aria-label')]);
  t('toast is a live status; decorative bits hidden; search labelled', misc[0]==='status' && misc[1]==='true' && misc[2]===true && /search/i.test(misc[3]), JSON.stringify(misc));
  await pg.evaluate(()=>{ location.hash='#/pulse'; }); await pg.waitForTimeout(300);
  await pg.focus('#pulse-body .hot[data-r="west-africa"]'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(250);
  const on=await pg.evaluate(()=>{ const b=document.querySelector('#pulse-body .pulsebar button.on'); return b?b.getAttribute('data-r'):null; });
  t('map pins work from the keyboard', on==='west-africa', on);
  t('no JS errors', errs.length===0, errs[0]||'');
  await ctx.close(); }

await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
