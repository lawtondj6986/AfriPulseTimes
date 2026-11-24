import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
function mk(slug,h,v,extra){return Object.assign({slug,status:'published',published_at:'2026-11-23T08:00:00Z',payload:{slug,headline:h,vertical:v,standfirst:'x',body:['Nairobi reports strong numbers.']}},extra||{});}
const ROWS=[mk('k1','Kenya rail line opens','markets'),
 mk('k2','Nairobi tech hub expands','tech'),
 mk('k3','Lagos port upgrade complete','markets'),
 mk('k4','Accra hosts summit','politics')];
const CFG=`const ROWS=${JSON.stringify(ROWS)};function q(){const p={select(){return p},eq(){return p},order(){return p},limit(){return p},then(r){return r({data:ROWS,error:null})}};return p}const m={from(){return q()}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const br=await chromium.launch(LAUNCH);
const pg=await (await br.newContext({viewport:{width:390,height:800}})).newPage();
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.addInitScript(()=>{
  window.__shared=null;
  try{ localStorage.setItem('afripulse_welcomed','1');
       localStorage.setItem('afripulse_streak',JSON.stringify({d:(function(){var d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();})(),n:4})); }catch(e){}
  Object.defineProperty(navigator,'canShare',{configurable:true,value:(d)=>!!(d&&d.files&&d.files.length)});
  Object.defineProperty(navigator,'share',{configurable:true,value:async(d)=>{ const f=d.files[0];
    const buf=await f.arrayBuffer();
    window.__shared={name:f.name,type:f.type,size:buf.byteLength,
      b64:btoa(Array.from(new Uint8Array(buf)).map(c=>String.fromCharCode(c)).join(''))};
  }});
});
await pg.goto(`http://127.0.0.1:${srv.address().port}/reader.html`,{waitUntil:'networkidle'});
await pg.waitForTimeout(600);
const R=[]; function t(n,ok,d){ R.push([n,ok,d]); }

// Read three stories (one twice — dedupe)
for(const s of ['k1','k2','k1','k3']){
  await pg.evaluate(sl=>{ location.hash='#/story/'+sl; },s);
  await pg.waitForTimeout(250);
}
const reads=await pg.evaluate(()=>JSON.parse(localStorage.getItem('afripulse_reads')||'[]'));
t('reads logged and deduped (3 unique)', reads.length===3 && reads.every(r=>r.s&&r.v&&r.d), JSON.stringify(reads));
t('region detected from text (east-africa)', reads.some(r=>r.g==='east-africa'), JSON.stringify(reads.map(r=>r.g)));

// Me tab shows the week
await pg.evaluate(()=>{ location.hash='#/me'; });
await pg.waitForTimeout(300);
const meTxt=await pg.locator('#me-body').innerText();
t('Me shows stories read + streak', meTxt.includes('3 stories read') && meTxt.includes('🔥') && meTxt.includes('4'), meTxt.slice(0,200));
t('favourite section named', meTxt.includes('Business & Markets'), meTxt.slice(0,200));

// Share my week → PNG
await pg.click('#wk-share');
await pg.waitForFunction(()=>!!window.__shared,null,{timeout:6000}).catch(()=>{});
const shared=await pg.evaluate(()=>window.__shared);
t('week card shared as PNG', !!shared && shared.type==='image/png' && shared.name==='afripulse-my-week.png' && shared.size>20000, shared&&shared.size);
if(shared) fs.writeFileSync(shot('week-card.png'), Buffer.from(shared.b64,'base64'));

// Empty state in a fresh profile
{ const ctx2=await br.newContext({viewport:{width:390,height:800}});
  const p2=await ctx2.newPage();
  await p2.addInitScript(()=>{ try{ localStorage.setItem('afripulse_welcomed','1'); localStorage.setItem('afripulse_lang','en'); }catch(e){} });
  await p2.goto(`http://127.0.0.1:${srv.address().port}/reader.html#/me`,{waitUntil:'networkidle'});
  await p2.waitForTimeout(400);
  const txt=await p2.locator('#me-body').innerText();
  t('empty state before any reads', txt.includes('Read a few stories'), txt.slice(0,120));
  await ctx2.close(); }

t('no JS errors', errs.length===0, errs[0]||'');
await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
