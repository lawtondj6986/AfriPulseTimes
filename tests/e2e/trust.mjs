import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
function mk(slug,h){return {slug,status:'published',published_at:new Date().toISOString(),payload:{slug,headline:h,vertical:'front',standfirst:'Dek.',body:['Body.']}};}
const ROWS=[mk('a1','Accra summit opens'),mk('a2','Lagos bourse jumps')];
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
  await pg.addInitScript(l=>{ try{ localStorage.setItem('afripulse_welcomed','1'); localStorage.setItem('afripulse_home_asked','1');
    if(!localStorage.getItem('afripulse_home')) localStorage.setItem('afripulse_home','["west-africa"]');
    if(l&&!localStorage.getItem('afripulse_lang')) localStorage.setItem('afripulse_lang',l); }catch(e){} },lang||'');
  await pg.goto(base,{waitUntil:'networkidle'}); await pg.waitForTimeout(600); return {ctx,pg,errs}; }

{ const {ctx,pg,errs}=await open();
  const links=await pg.evaluate(()=>[...document.querySelectorAll('#today-body .foot a')].map(a=>[a.textContent,a.getAttribute('href')]));
  const m=Object.fromEntries(links);
  t('Today ends with About, Privacy, Terms, RSS and Newsroom links', links.length===5 && m.About==='/afripulse-preview.html#/about' && m.Privacy==='/afripulse-preview.html#/privacy' && m.Terms==='/afripulse-preview.html#/terms' && m.RSS==='/feed.xml' && m.Newsroom==='/desk', JSON.stringify(links));
  // build some history, then erase it
  await pg.evaluate(()=>{ location.hash='#/story/a1'; }); await pg.waitForTimeout(250);
  await pg.evaluate(()=>{ location.hash='#/'; }); await pg.waitForTimeout(250);
  t('history exists before clearing', (await pg.locator('#today-body .rd').count())===1 || (await pg.evaluate(()=>!!localStorage.getItem('afripulse_reads'))));
  await pg.evaluate(()=>{ location.hash='#/me'; }); await pg.waitForTimeout(300);
  const row=await pg.evaluate(()=>{ const b=document.getElementById('clear-hist'); return b.closest('.setrow').innerText; });
  t('Me explains what is stored and links to the privacy page', row.includes('only on this device') && (await pg.locator('#me-body a[href="/afripulse-preview.html#/privacy"]').count())>=1, row.slice(0,120));
  await pg.locator('#clear-hist').scrollIntoViewIfNeeded(); await pg.screenshot({path:shot('trust-shot.png')});
  await pg.click('#clear-hist'); await pg.waitForTimeout(200);
  const after=await pg.evaluate(()=>['afripulse_reads','afripulse_streak','afripulse_seen','afripulse_home'].map(k=>localStorage.getItem(k)));
  t('clearing removes diary, streak and last-visit — and nothing else', after[0]===null && after[1]===null && after[2]===null && after[3]==='["west-africa"]', JSON.stringify(after));
  t('the button confirms', (await pg.locator('#clear-hist').innerText()).includes('cleared') && (await pg.locator('#me-body').innerText()).includes('Read a few stories'));
  await pg.evaluate(()=>{ location.hash='#/'; }); await pg.waitForTimeout(300);
  t('Today shows no read marks afterwards', (await pg.locator('#today-body .rd').count())===0 && (await pg.locator('#today-body .card.read').count())===0);
  t('no JS errors', errs.length===0, errs[0]||'');
  await ctx.close(); }

{ const {ctx,pg}=await open('fr');
  const labels=await pg.evaluate(()=>[...document.querySelectorAll('#today-body .foot a')].map(a=>a.textContent));
  t('French footer', labels.includes('À propos') && labels.includes('Confidentialité') && labels.includes('Rédaction'), JSON.stringify(labels));
  await ctx.close(); }

await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
