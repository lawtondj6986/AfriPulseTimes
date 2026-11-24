import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
function mk(slug,h){return {slug,status:'published',published_at:new Date().toISOString(),payload:{slug,headline:h,vertical:'front',standfirst:'Dek.',body:['Body.']}};}
const ROWS=[mk('a1','Accra summit opens'),mk('a2','Lagos bourse jumps')];
const CFG=`const ROWS=${JSON.stringify(ROWS)};function q(){const p={select(){return p},eq(){return p},order(){return p},limit(){return p},then(r){return r({data:ROWS,error:null})}};return p}const m={from(){return q()}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const br=await chromium.launch(LAUNCH);
const pg=await (await br.newContext({viewport:{width:390,height:800}})).newPage();
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.addInitScript(()=>{ try{ localStorage.setItem('afripulse_welcomed','1'); localStorage.setItem('afripulse_home_asked','1'); }catch(e){} });
await pg.goto(`http://127.0.0.1:${srv.address().port}/reader.html`,{waitUntil:'networkidle'}); await pg.waitForTimeout(600);
const R=[]; function t(n,ok,d){ R.push([n,ok,d]); }
const views=()=>pg.evaluate(()=>(window.vaq||[]).filter(a=>a[0]==='pageview').map(a=>a[1].path));
t('first screen counted once despite the data re-render', JSON.stringify(await views())==='["/"]', JSON.stringify(await views()));
await pg.evaluate(()=>{ location.hash='#/story/a1'; }); await pg.waitForTimeout(250);
await pg.evaluate(()=>{ location.hash='#/pulse'; }); await pg.waitForTimeout(250);
await pg.evaluate(()=>{ location.hash='#/story/a2'; }); await pg.waitForTimeout(250);
await pg.evaluate(()=>{ location.hash='#/'; }); await pg.waitForTimeout(250);
t('each screen and story is one view, in order', JSON.stringify(await views())==='["/","/story/a1","/pulse","/story/a2","/"]', JSON.stringify(await views()));
t('missing analytics script causes no errors', errs.length===0, errs[0]||'');
await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
