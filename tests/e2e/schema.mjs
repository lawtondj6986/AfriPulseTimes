// The database may lack the optional `translations` column. The reader must
// still load the edition, a deep-linked story, and the archive.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH } from './_env.mjs';
const NOW=Date.now(),H=3600000;
const ROWS=[0,1,2].map(i=>({slug:'s'+i,status:'published',published_at:new Date(NOW-(i+1)*H).toISOString(),payload:{slug:'s'+i,headline:'Story number '+i+' from the newsroom',vertical:'politics',standfirst:'A summary of story '+i+'.',body:['Body.']}}));
// Mirrors PostgREST: selecting a column that does not exist fails the whole request.
const CFG=`const ROWS=${JSON.stringify(ROWS)};window.__sel=[];function q(cols){window.__sel.push(cols);const bad=/translations/.test(cols);let slug=null;const p={eq(k,v){if(k==='slug')slug=v;return p},lt(){return p},ilike(){return p},order(){return p},limit(){return p},
 then(r){return r(bad?{data:null,error:{code:'42703',message:'column articles.translations does not exist'}}:{data:slug?ROWS.filter(x=>x.slug===slug):ROWS,error:null})}};return p}
const m={from(){return {select:q}}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const base=`http://127.0.0.1:${srv.address().port}/reader.html`;
const br=await chromium.launch(LAUNCH);
const R=[]; function t(n,ok,d){ R.push([n,ok,d]); }
async function open(hash){ const ctx=await br.newContext({viewport:{width:390,height:800}}); const pg=await ctx.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{ try{ localStorage.setItem('afripulse_welcomed','1'); localStorage.setItem('afripulse_home_asked','1'); }catch(e){} });
  await pg.goto(base+(hash||''),{waitUntil:'networkidle'}); await pg.waitForTimeout(700); return {ctx,pg,errs}; }

{ const {ctx,pg,errs}=await open();
  t('the edition loads without the translations column', (await pg.locator('#today-body a[href^="#/story/"]').count())===3 && (await pg.locator('#today-body .empty').count())===0);
  const sel=await pg.evaluate(()=>window.__sel);
  t('it asks once with the column, then without', sel.length===2 && /translations/.test(sel[0]) && !/translations/.test(sel[1]), JSON.stringify(sel));
  await pg.click('#more-btn').catch(()=>{}); await pg.waitForTimeout(400);
  const sel2=await pg.evaluate(()=>window.__sel);
  t('later queries skip the missing column straight away', sel2.slice(2).every(c=>!/translations/.test(c)), JSON.stringify(sel2));
  t('no JS errors', errs.length===0, errs[0]||''); await ctx.close(); }

{ const {ctx,pg}=await open('#/story/s2');
  t('a story opens directly', /Story number 2/.test(await pg.locator('.st-h').innerText().catch(()=>'')));
  await ctx.close(); }

await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
