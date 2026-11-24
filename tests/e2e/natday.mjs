import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
const CFG=`const m={from(){const p={select(){return p},eq(){return p},order(){return p},limit(){return p},then(r){return r({data:[],error:null})}};return p}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const base=`http://127.0.0.1:${srv.address().port}/reader.html`;
const br=await chromium.launch(LAUNCH);

async function page(fixedISO, init){
  const ctx=await br.newContext({viewport:{width:390,height:800}});
  const pg=await ctx.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(([iso,extra])=>{
    const FIXED=new Date(iso).getTime(); const RD=Date;
    class FD extends RD{ constructor(...a){ a.length?super(...a):super(FIXED); } static now(){ return FIXED; } }
    window.Date=FD;
    try{ localStorage.setItem('afripulse_welcomed','1');
         if(extra&&extra.streak) localStorage.setItem('afripulse_streak',extra.streak);
         if(extra&&extra.lang) localStorage.setItem('afripulse_lang',extra.lang); }catch(e){}
  },[fixedISO, init||{}]);
  await pg.goto(base,{waitUntil:'networkidle'});
  await pg.waitForTimeout(400);
  return {pg,ctx,errs};
}
const R=[];
function t(n,ok,d){ R.push([n,ok,d]); }

// 1 · Jamhuri Day (Kenya, Dec 12) — banner, flag, 63 years
{ const {pg,ctx,errs}=await page('2026-12-12T10:00:00');
  const hidden=await pg.locator('#natday').isHidden();
  const txt=hidden?'':await pg.locator('#natday').innerText();
  t('Dec 12 shows Kenya banner', !hidden && txt.includes('Kenya') && txt.includes('🇰🇪'), txt);
  t('years computed (63)', txt.includes('63'), txt);
  t('no JS errors (Dec 12)', errs.length===0, errs[0]||'');
  await ctx.close(); }

// 2 · July 1 — Somalia + Rwanda + Burundi, three lines
{ const {pg,ctx}=await page('2027-07-01T10:00:00');
  const n=await pg.locator('#natday div').count();
  const txt=await pg.locator('#natday').innerText();
  t('Jul 1 shows all three nations', n===3 && txt.includes('Somalia') && txt.includes('Rwanda') && txt.includes('Burundi'), n+' · '+txt);
  await ctx.close(); }

// 3 · A quiet day — banner stays hidden
{ const {pg,ctx}=await page('2026-12-13T10:00:00');
  t('quiet day → hidden', await pg.locator('#natday').isHidden());
  await ctx.close(); }

// 4 · Streak: yesterday n=4 → greeting shows 🔥 5
{ const {pg,ctx}=await page('2026-12-12T10:00:00',{streak:JSON.stringify({d:'2026-12-11',n:4})});
  const g=await pg.locator('#greet').innerText();
  t('streak continues to 5', g.includes('🔥') && g.includes('5'), g);
  const stored=await pg.evaluate(()=>localStorage.getItem('afripulse_streak'));
  t('streak persisted for today', JSON.parse(stored).d==='2026-12-12' && JSON.parse(stored).n===5, stored);
  await ctx.close(); }

// 5 · Streak broken (3 days ago) → no flame on day 1
{ const {pg,ctx}=await page('2026-12-12T10:00:00',{streak:JSON.stringify({d:'2026-12-9',n:9})});
  const g=await pg.locator('#greet').innerText();
  t('broken streak resets quietly', !g.includes('🔥'), g);
  await ctx.close(); }

// 6 · French — localized sentence and country name via Intl.DisplayNames
{ const {pg,ctx}=await page('2026-12-12T10:00:00',{lang:'fr'});
  const txt=await pg.locator('#natday').innerText();
  t('French banner localized', /indépendance/i.test(txt) && txt.includes('Kenya'), txt);
  await ctx.close(); }

await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
