import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
const CFG=`const m={from(){const p={select(){return p},eq(){return p},order(){return p},limit(){return p},then(r){return r({data:[],error:null})}};return p}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const base=`http://127.0.0.1:${srv.address().port}/reader.html`;
const br=await chromium.launch(LAUNCH);
const R=[]; function t(n,ok,d){ R.push([n,ok,d]); }
const FIRE=`(outcome)=>{ const e=new Event('beforeinstallprompt');
  e.prompt=()=>{ window.__prompted=(window.__prompted||0)+1; return Promise.resolve(); };
  e.userChoice=Promise.resolve({outcome}); window.dispatchEvent(e); }`;

async function fresh(opts){
  const ctx=await br.newContext(Object.assign({viewport:{width:390,height:800}},opts||{}));
  const pg=await ctx.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{ try{ localStorage.setItem('afripulse_welcomed','1'); }catch(e){} });
  await pg.goto(base,{waitUntil:'networkidle'}); await pg.waitForTimeout(300);
  return {ctx,pg,errs};
}

// 1 · native prompt flow: banner appears, Install triggers the browser prompt, accepted → gone for good
{ const {ctx,pg,errs}=await fresh();
  t('no banner before the browser offers', await pg.locator('#instbar').isHidden());
  await pg.evaluate(eval(FIRE),'accepted'); await pg.waitForTimeout(200);
  const txt=await pg.locator('#instbar').innerText();
  t('banner appears on beforeinstallprompt', await pg.locator('#instbar').isVisible() && txt.includes('pocket') && txt.includes('Install'), txt);
  await pg.screenshot({path:shot('install-shot.png'), clip:{x:0,y:0,width:390,height:330}});
  await pg.click('#inst-go'); await pg.waitForTimeout(300);
  const n=await pg.evaluate(()=>window.__prompted);
  const flag=await pg.evaluate(()=>localStorage.getItem('afripulse_installed'));
  t('Install calls the native prompt; accepted → remembered', n===1 && flag==='1' && await pg.locator('#instbar').isHidden(), n+' · '+flag);
  await pg.evaluate(eval(FIRE),'accepted'); await pg.waitForTimeout(200);
  t('never shown again once installed', await pg.locator('#instbar').isHidden());
  t('no JS errors (native)', errs.length===0, errs[0]||'');
  await ctx.close(); }

// 2 · "Not now" snoozes for 14 days
{ const {ctx,pg}=await fresh();
  await pg.evaluate(eval(FIRE),'accepted'); await pg.waitForTimeout(200);
  await pg.click('#inst-no'); await pg.waitForTimeout(200);
  const snooze=await pg.evaluate(()=>+localStorage.getItem('afripulse_inst_snooze')||0);
  await pg.evaluate(eval(FIRE),'accepted'); await pg.waitForTimeout(200);
  t('Not now hides + snoozes ~14 days', await pg.locator('#instbar').isHidden() && snooze>Date.now()+13*86400000, String(snooze));
  await ctx.close(); }

// 3 · dismissing the native prompt itself also snoozes
{ const {ctx,pg}=await fresh();
  await pg.evaluate(eval(FIRE),'dismissed'); await pg.waitForTimeout(200);
  await pg.click('#inst-go'); await pg.waitForTimeout(300);
  const sn=await pg.evaluate(()=>+localStorage.getItem('afripulse_inst_snooze')||0);
  t('declined browser prompt → snoozed, not nagged', sn>Date.now() && await pg.locator('#instbar').isHidden(), String(sn));
  await ctx.close(); }

// 4 · iOS: hint instead of a button
{ const {ctx,pg}=await fresh({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
  const txt=await pg.locator('#instbar').innerText();
  const hasGo=await pg.locator('#inst-go').count();
  t('iPhone gets the Add-to-Home-Screen hint', await pg.locator('#instbar').isVisible() && txt.includes('Add to Home Screen') && hasGo===0, txt);
  await ctx.close(); }

// 5 · already running as an installed app → nothing, ever
{ const ctx=await br.newContext({viewport:{width:390,height:800}});
  const pg=await ctx.newPage();
  await pg.addInitScript(()=>{
    try{ localStorage.setItem('afripulse_welcomed','1'); }catch(e){}
    const mm=window.matchMedia;
    window.matchMedia=q=>(q==='(display-mode: standalone)')?{matches:true}:mm.call(window,q);
  });
  await pg.goto(base,{waitUntil:'networkidle'}); await pg.waitForTimeout(300);
  await pg.evaluate(eval(FIRE),'accepted'); await pg.waitForTimeout(200);
  t('standalone app never sees the banner', await pg.locator('#instbar').isHidden());
  await ctx.close(); }

// 6 · French localization
{ const ctx=await br.newContext({viewport:{width:390,height:800}});
  const pg=await ctx.newPage();
  await pg.addInitScript(()=>{ try{ localStorage.setItem('afripulse_welcomed','1'); localStorage.setItem('afripulse_lang','fr'); }catch(e){} });
  await pg.goto(base,{waitUntil:'networkidle'}); await pg.waitForTimeout(300);
  await pg.evaluate(eval(FIRE),'accepted'); await pg.waitForTimeout(200);
  const txt=await pg.locator('#instbar').innerText();
  t('French banner', txt.includes('poche') && txt.includes('Installer'), txt);
  await ctx.close(); }

await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
