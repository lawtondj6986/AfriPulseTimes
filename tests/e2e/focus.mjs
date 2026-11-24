import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
const NOW=Date.now(),H=3600000;
// Real headlines from one live edition, in their original mix of sentence case and Title Case.
const HEADS=[
 ['Nigeria: At least 24 Dead After Boat Capsizes','front'],
 ['Africa: COP31 Cover Deal Collapses As EU and Others Reject Draft Over Fossil Fuel Omission','politics'],
 ['COP31: Nigeria absent at closing plenary','politics'],
 ['Amid divisions, COP31 president says climate talks near deal','politics'],
 ['Fossil fuel impasse pushes COP31 climate talks into second day of overtime','mining'],
 ['Bayelsa Boat Mishap: Death toll rises, Tinubu approves N250mn for victims’ families','politics'],
 ['Go reconcile with Katsina governor, Tinubu tells Masari','politics'],
 ['Tinubu signs irrigation deal with manufacturer','markets'],
 ['Sudan: Drones Strikes Hit UN Building in Residential Area of Khartoum','politics'],
 ['Kenya: Ruto, Tshisekedi Agree to Restore Full Diplomatic Relations Between Kenya and DR Congo','politics'],
 ['Zimbabwe: Pastor Arrested Over Assault Allegations After Boat Party','politics'],
 ['Malawi: Three in Four Malawians Live in Poverty After Boat Levy, Survey Finds','markets']
];
const ROWS=HEADS.map((h,i)=>({slug:'s'+i,status:'published',published_at:new Date(NOW-(i+1)*H).toISOString(),payload:{slug:'s'+i,headline:h[0],vertical:h[1],standfirst:'A summary of story '+i+'.',body:['Body.']}}));
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
  await pg.addInitScript(l=>{ try{ localStorage.setItem('afripulse_welcomed','1'); localStorage.setItem('afripulse_home_asked','1'); localStorage.setItem('afripulse_subscribed','1'); if(l&&!localStorage.getItem('afripulse_lang')) localStorage.setItem('afripulse_lang',l); }catch(e){} },lang||'');
  await pg.goto(base,{waitUntil:'networkidle'}); await pg.waitForTimeout(600); return {ctx,pg,errs}; }

{ const {ctx,pg,errs}=await open();
  const topics=await pg.evaluate(()=>[...document.querySelectorAll('.focus button')].map(b=>[b.getAttribute('data-q'),b.querySelector('b').textContent]));
  t('subjects shared by three or more stories are in focus, most-covered first', JSON.stringify(topics)==='[["COP31","4"],["Tinubu","3"]]', JSON.stringify(topics));
  t('a Title-Cased common noun ("Boat", in four headlines) is not mistaken for a subject', !topics.some(x=>/boat/i.test(x[0])));
  t('countries are left to the nations row', !topics.some(x=>/nigeria|kenya|sudan/i.test(x[0])));
  await pg.evaluate(()=>document.querySelector('.focus').scrollIntoView({block:'center'})); await pg.waitForTimeout(100);
  await pg.screenshot({path:shot('focus-shot.png')});
  await pg.click('.focus [data-q="COP31"]'); await pg.waitForTimeout(250);
  const heads=await pg.evaluate(()=>[...document.querySelectorAll('#today-body a.card h3')].map(h=>h.textContent));
  t('one tap gathers the scattered stories', heads.length===4 && heads.every(h=>h.includes('COP31')) && (await pg.inputValue('#q'))==='COP31', JSON.stringify(heads));
  await pg.fill('#q',''); await pg.waitForTimeout(250);
  t('clearing the search brings the edition and the focus row back', (await pg.locator('.hero').count())===1 && (await pg.locator('.focus button').count())===2);
  t('no JS errors', errs.length===0, errs[0]||'');
  await ctx.close(); }

{ const {ctx,pg}=await open('fr');
  t('French label', (await pg.locator('.focus span').innerText()).toLowerCase()==='à suivre');
  await ctx.close(); }

await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
