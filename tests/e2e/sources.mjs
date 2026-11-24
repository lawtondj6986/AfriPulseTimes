// One story, many sources · glossary · keyboard · print
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
const NOW=Date.now(),H=3600000;
const LONG='Witnesses said the strike came before dawn. ECOWAS and the AU condemned the attack, and ECOWAS called an emergency summit. The AUTHOR of the report was not named. '.repeat(3);
const S=[
 ['Sudan: Drone Strikes Hit UN Building in Residential Area of Khartoum','Al Jazeera','https://aljazeera.example/sudan',['Short report.']],
 ['Drone strikes hit UN building in residential area of Khartoum','Sudan Tribune','https://sudantribune.example/drones',[LONG,'A second paragraph.']],
 ['COP31: Nigeria absent at closing plenary','Premium Times','https://pt.example/1',['Body.']],
 ['Amid divisions, COP31 president says climate talks near deal','Reuters','https://reuters.example/2',['Body.']],
 ['Fossil fuel impasse pushes COP31 climate talks into second day of overtime','The East African','https://ea.example/3',['Body.']],
 ['Kenya: Ruto, Tshisekedi Agree to Restore Full Diplomatic Relations Between Kenya and DR Congo','allAfrica','https://aa.example/4',['Body.']],
 ['Ruto and Tshisekedi agree to restore full diplomatic relations between Kenya, DR Congo','The Star','https://star.example/5',['Body.']],
 ['Kenya and DR Congo restore full diplomatic relations as Ruto, Tshisekedi agree','Daily Nation','https://nation.example/6',['Body.']]
];
const ROWS=S.map((h,i)=>({slug:'s'+i,status:'published',published_at:new Date(NOW-(i+1)*H).toISOString(),
  payload:{slug:'s'+i,headline:h[0],vertical:'politics',standfirst:'Summary of story number '+i+' for the test edition.',body:h[3],source:'rss',sourceLabel:h[1],sourceUrl:h[2]}}));
const CFG=`const ROWS=${JSON.stringify(ROWS)};function q(){const p={select(){return p},eq(){return p},lt(){return p},order(){return p},limit(){return p},then(r){return r({data:ROWS,error:null})}};return p}const m={from(){return q()}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const base=`http://127.0.0.1:${srv.address().port}/reader.html`;
const br=await chromium.launch(LAUNCH);
const R=[]; function t(n,ok,d){ R.push([n,ok,d]); }
async function open(lang,vp){ const ctx=await br.newContext({viewport:vp||{width:390,height:800},deviceScaleFactor:2}); const pg=await ctx.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(l=>{ try{ localStorage.setItem('afripulse_welcomed','1'); localStorage.setItem('afripulse_home_asked','1'); localStorage.setItem('afripulse_subscribed','1'); if(l&&!localStorage.getItem('afripulse_lang')) localStorage.setItem('afripulse_lang',l); }catch(e){} },lang||'');
  await pg.goto(base,{waitUntil:'networkidle'}); await pg.waitForTimeout(600); return {ctx,pg,errs}; }
const slugs=pg=>pg.evaluate(()=>[...new Set([...document.querySelectorAll('#today-body a[href^="#/story/"]')].map(a=>a.getAttribute('href').slice(8)))]);

{ const {ctx,pg,errs}=await open();
  const sl=await slugs(pg);
  t('eight reports of five events show as five stories', sl.length===5, JSON.stringify(sl));
  t('the fuller report wins the card; three COP31 stories stay separate', sl.includes('s1')&&!sl.includes('s0')&&['s2','s3','s4'].every(x=>sl.includes(x)), JSON.stringify(sl));
  const n=await pg.evaluate(()=>[...document.querySelectorAll('.nsrc')].map(e=>e.textContent));
  t('merged cards say how many outlets reported it', JSON.stringify(n.sort())==='["2 sources","3 sources"]', JSON.stringify(n));
  await pg.evaluate(()=>document.querySelector('.nsrc').scrollIntoView({block:'center'})); await pg.screenshot({path:shot('sources-card.png')});
  await pg.evaluate(()=>{location.hash='#/story/s1';}); await pg.waitForTimeout(400);
  const also=await pg.evaluate(()=>{const a=document.querySelector('.srcbox .also a');return a&&[a.textContent,a.href,document.querySelector('.srcbox .also').textContent];});
  t('the story credits and links the other outlet', also&&also[0]==='Al Jazeera'&&also[1]==='https://aljazeera.example/sudan'&&/^Also reported by/.test(also[2]), JSON.stringify(also));
  t('a Khartoum story is filed under North Africa even when its text mentions ECOWAS', /North Africa/.test(await pg.evaluate(()=>document.querySelector('.st-meta').textContent)));
  const gl=await pg.evaluate(()=>[...document.querySelectorAll('.st-body .gl')].map(b=>b.textContent));
  t('each acronym is marked once, and never inside another word', JSON.stringify(gl)==='["ECOWAS","AU"]', JSON.stringify(gl));
  await pg.click('.gl[data-g="ECOWAS"]'); await pg.waitForTimeout(150);
  const toast=await pg.evaluate(()=>{const e=document.getElementById('toast');return e.hidden?'':e.textContent;});
  t('tapping an acronym explains it', /^ECOWAS — Economic Community of West African States/.test(toast), toast);
  await pg.evaluate(()=>document.querySelector('.gl').scrollIntoView({block:'center'})); await pg.screenshot({path:shot('sources-gloss.png')}); await pg.evaluate(()=>{document.getElementById('toast').hidden=true;document.querySelector('.srcbox').scrollIntoView({block:'center'});}); await pg.screenshot({path:shot('sources-story.png')});
  await pg.reload({waitUntil:'networkidle'}); await pg.waitForTimeout(500);
  t('the credit survives a reload from the offline pack', await pg.evaluate(()=>!!document.querySelector('.srcbox .also a')));
  await pg.emulateMedia({media:'print'});
  const pr=await pg.evaluate(()=>{const v=s=>{const e=document.querySelector(s);return !!e&&getComputedStyle(e).display!=='none';};return [v('.st-h'),v('.st-body'),v('.srcbox'),v('#tabbar'),v('#share-btn'),v('.sharerow'),v('.srcbox .btn')];});
  t('printing keeps the article and its sources, drops the app chrome', JSON.stringify(pr)==='[true,true,true,false,false,false,false]', JSON.stringify(pr));
  t('no page errors (phone)', errs.length===0, errs.join('|')); await ctx.close(); }

{ const {ctx,pg,errs}=await open('fr');
  await pg.evaluate(()=>{location.hash='#/story/s1';}); await pg.waitForTimeout(400);
  t('the glossary stays out of other languages', await pg.evaluate(()=>document.querySelectorAll('.gl').length===0));
  t('the outlet count is localized', await pg.evaluate(()=>{location.hash='#/';return new Promise(r=>setTimeout(()=>r([...document.querySelectorAll('.nsrc')].some(e=>e.textContent==='2 sources')),300));}));
  t('no page errors (fr)', errs.length===0, errs.join('|')); await ctx.close(); }

{ const {ctx,pg,errs}=await open('',{width:1280,height:800});
  t('desktop shows the keyboard hint', await pg.evaluate(()=>{const k=document.querySelector('.keys');return !!k&&getComputedStyle(k).display!=='none';}));
  await pg.keyboard.press('j'); await pg.keyboard.press('j');
  const f=await pg.evaluate(()=>document.activeElement.getAttribute('href'));
  const order=await pg.evaluate(()=>[...document.querySelectorAll('#today-body a[href^="#/story/"]')].map(a=>a.getAttribute('href')));
  t('J walks down the front page', f===order[1], f);
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(300);
  const h1=await pg.evaluate(()=>location.hash);
  await pg.keyboard.press('j'); await pg.waitForTimeout(300);
  const h2=await pg.evaluate(()=>location.hash);
  t('Enter opens the story and J moves to the next one', h1===order[1]&&/^#\/story\//.test(h2)&&h2!==h1, h1+' '+h2);
  await pg.keyboard.press('s'); await pg.waitForTimeout(150);
  t('S saves the story', await pg.evaluate(()=>document.getElementById('save-btn').classList.contains('on')));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
  await pg.keyboard.press('/'); await pg.waitForTimeout(150);
  t('Esc returns to the front page and / jumps to search', await pg.evaluate(()=>location.hash==='#/'&&document.activeElement.id==='q'));
  await pg.keyboard.type('jk'); 
  t('typing in search is never hijacked', await pg.evaluate(()=>document.getElementById('q').value==='jk'&&document.activeElement.id==='q'));
  t('no page errors (desktop)', errs.length===0, errs.join('|')); await ctx.close(); }

await br.close(); srv.close();
let bad=0; for(const [n,ok,d] of R){ if(!ok) bad++; console.log((ok?'PASS ':'FAIL ')+n+(ok||!d?'':'  → '+d)); }
console.log(`${R.length-bad}/${R.length}`); process.exit(bad?1:0);
