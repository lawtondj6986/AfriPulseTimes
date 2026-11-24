import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
const NOW=Date.now(),H=3600000;
function mk(slug,h,v,i){return {slug,status:'published',published_at:new Date(NOW-i*H).toISOString(),payload:{slug,headline:h,vertical:v,standfirst:'Dek.',body:['Body.']}};}
const ROWS=[mk('k1','Kenya & Uganda sign “rail” pact','politics',1),
 mk('p2','Ghana parliament passes budget','politics',2),mk('p3','Senegal election date set','politics',3),mk('p4','Zambia cabinet reshuffle','politics',4),
 mk('k5','Nairobi bourse posts record week','markets',5),mk('k6','Kenya tea exports climb','mining',6)];
const CFG=`const ROWS=${JSON.stringify(ROWS)};function q(){const p={select(){return p},eq(){return p},order(){return p},limit(){return p},then(r){return r({data:ROWS,error:null})}};return p}const m={from(){return q()}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const origin=`http://127.0.0.1:${srv.address().port}`;
const br=await chromium.launch(LAUNCH);
const ctx=await br.newContext({viewport:{width:390,height:800},deviceScaleFactor:2,permissions:['clipboard-read','clipboard-write']}); const pg=await ctx.newPage();
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.addInitScript(()=>{ try{ localStorage.setItem('afripulse_welcomed','1'); localStorage.setItem('afripulse_home_asked','1'); }catch(e){} });
await pg.goto(origin+'/reader.html#/story/k1',{waitUntil:'networkidle'}); await pg.waitForTimeout(600);
const R=[]; function t(n,ok,d){ R.push([n,ok,d]); }

const wa=await pg.evaluate(()=>{ const a=document.getElementById('wa-btn'); return [a.href,a.target,a.rel]; });
const text=decodeURIComponent(wa[0].split('?text=')[1]);
t('WhatsApp link carries the headline and the story’s own link', wa[0].startsWith('https://wa.me/?text=') && text==='Kenya & Uganda sign “rail” pact\n'+origin+'/s/k1', text);
t('opens in a new tab safely', wa[1]==='_blank' && wa[2].includes('noopener'));
await pg.click('#copy-btn'); await pg.waitForTimeout(200);
const clip=await pg.evaluate(()=>navigator.clipboard.readText());
t('copy link puts the share URL on the clipboard and confirms', clip===origin+'/s/k1' && (await pg.locator('#copy-btn').innerText()).includes('copied'), clip);
const rel=await pg.evaluate(()=>[...document.querySelectorAll('.related a.card h3')].map(h=>h.textContent));
t('related leads with the same nation, not just the same section', rel.length>=2 && /Nairobi|Kenya/.test(rel[0]) && /Nairobi|Kenya/.test(rel[1]), JSON.stringify(rel));
await pg.evaluate(()=>{ const r=document.querySelector('.sharerow'); r.scrollIntoView({block:'center'}); }); await pg.waitForTimeout(150);
await pg.screenshot({path:shot('share-shot.png')});
t('no JS errors', errs.length===0, errs[0]||'');
await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
