import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
const NOW=Date.now(), H=3600000;
const LONG=Array.from({length:14},(_,i)=>'Paragraph '+i+'. '+'Steady progress across the continent today. '.repeat(6));
function mk(slug,h,v,ts){return {slug,status:'published',published_at:new Date(ts).toISOString(),payload:{slug,headline:h,vertical:v,standfirst:'Dek '+slug+'.',body:LONG}};}
const ROWS=[mk('a1','Accra summit opens','front',NOW-5*H),mk('a2','Lagos bourse jumps','markets',NOW-6*H),mk('a3','Kigali fintech round','markets',NOW-7*H)];
const EXTRA=mk('x1','Breaking: Nairobi rail deal signed','politics',NOW);
const CFG=`window.__rows=${JSON.stringify(ROWS)};window.__fetches=0;function q(){const p={select(){return p},eq(){return p},order(){return p},limit(){return p},then(r){window.__fetches++;return r({data:window.__rows,error:null})}};return p}const m={from(){return q()}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
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
const back=()=>pg.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
const jump=(min)=>pg.evaluate(m=>{ const real=Date.now.bind(Date); const off=m*60000; Date.now=()=>real()+off; },min);

const f0=await pg.evaluate(()=>window.__fetches);
await back(); await pg.waitForTimeout(250);
t('returning within 5 minutes does not refetch', (await pg.evaluate(()=>window.__fetches))===f0);

// a story lands while the reader is away 6 minutes, on the Today screen
await pg.evaluate(x=>{ window.__rows=[x].concat(window.__rows); },EXTRA);
await jump(6); await back(); await pg.waitForTimeout(400);
const toast=await pg.locator('#toast').innerText().catch(()=>'' );
t('quiet refetch after 5+ minutes', (await pg.evaluate(()=>window.__fetches))===f0+1);
t('toast announces the arrival', await pg.locator('#toast').isVisible() && toast.includes('(1)'), toast);
const heads=await pg.evaluate(()=>[...document.querySelectorAll('#today-body h3,#today-body h2')].map(h=>h.textContent));
const badge=await pg.evaluate(()=>[...document.querySelectorAll('#today-body a')].filter(c=>c.textContent.includes('Breaking')).some(c=>c.querySelector('.newb')));
t('new story appears with a NEW badge', heads.some(h=>h.includes('Breaking')) && badge, JSON.stringify(heads));
await pg.screenshot({path:shot('live-shot.png')});

// mid-story: a refresh must not yank the reader to the top
await pg.evaluate(()=>{ location.hash='#/story/a2'; }); await pg.waitForTimeout(300);
await pg.evaluate(()=>window.scrollTo(0,900)); await pg.waitForTimeout(150);
const y0=await pg.evaluate(()=>window.scrollY);
await pg.evaluate(x=>{ const y=JSON.parse(JSON.stringify(x)); y.slug='x2'; y.payload.slug='x2'; y.payload.headline='Breaking: second arrival'; window.__rows=[y].concat(window.__rows); },EXTRA);
await jump(12); await back(); await pg.waitForTimeout(400);
const y1=await pg.evaluate(()=>window.scrollY);
t('reader mid-story is not scroll-jumped', y0>500 && Math.abs(y1-y0)<5, y0+' → '+y1);
t('toast still tells them', await pg.locator('#toast').isVisible());
await pg.click('#toast'); await pg.waitForTimeout(350);
const h=await pg.evaluate(()=>location.hash);
const has2=await pg.evaluate(()=>document.getElementById('today-body').textContent.includes('second arrival'));
t('tapping the toast opens Today with the new story', h==='#/' && has2 && await pg.locator('#toast').isHidden(), h);

// Related and Up next never show the same card
await pg.evaluate(()=>{ location.hash='#/story/a2'; }); await pg.waitForTimeout(300);
const dup=await pg.evaluate(()=>{ const r=[...document.querySelectorAll('.related a.card')].map(a=>a.getAttribute('href')); const n=document.querySelector('.nextup a.card'); return n?r.includes(n.getAttribute('href')):false; });
t('Related never repeats the Up next story', dup===false);

t('no JS errors', errs.length===0, errs[0]||'');
await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
