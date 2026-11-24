import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
const NOW=Date.now(),H=3600000;
function mk(slug,h,v,i){return {slug,status:'published',published_at:new Date(NOW-i*H).toISOString(),payload:{slug,headline:h,vertical:v,standfirst:'Dek for '+slug+'.',body:['Body of '+slug+'.']}};}
const EDITION=[mk('e1','Today: Accra summit opens','front',1),mk('e2','Today: Lagos bourse jumps','markets',2)];
const ARCHIVE=[mk('old-story','Archive: the 2025 cocoa accord','markets',900)];
// A mock that honours .eq('slug', x): single-story lookups hit the archive too.
const CFG=`const EDITION=${JSON.stringify(EDITION)}, ARCHIVE=${JSON.stringify(ARCHIVE)};window.__slugFetches=0;
function q(){const f={};const p={select(){return p},eq(c,v){f[c]=v;return p},order(){return p},limit(){return p},
 then(r){ if(f.slug){ window.__slugFetches++; return r({data:EDITION.concat(ARCHIVE).filter(x=>x.slug===f.slug),error:null}); } return r({data:EDITION,error:null}); }};return p}
const m={from(){return q()}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const base=`http://127.0.0.1:${srv.address().port}/reader.html`;
const br=await chromium.launch(LAUNCH);
const R=[]; function t(n,ok,d){ R.push([n,ok,d]); }
const SEED=(saved)=>{ try{ localStorage.setItem('afripulse_welcomed','1'); localStorage.setItem('afripulse_home_asked','1');
  if(saved) localStorage.setItem('afripulse_saved_v1',saved); }catch(e){} };

// 1 · a cold visitor lands directly on an old story (search result / shared link)
{ const ctx=await br.newContext({viewport:{width:390,height:800}}); const pg=await ctx.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(SEED,null);
  await pg.goto(base+'#/story/old-story',{waitUntil:'networkidle'}); await pg.waitForTimeout(700);
  const txt=await pg.locator('#story-body').innerText();
  t('older story opens from a direct link', txt.includes('the 2025 cocoa accord') && txt.includes('Body of old-story'), txt.slice(0,120));
  // save it, leave, come back: served from memory, no second fetch
  await pg.click('#save-btn'); await pg.waitForTimeout(150);
  const saved=await pg.evaluate(()=>JSON.parse(localStorage.getItem('afripulse_saved_v1')||'[]').map(s=>s.slug));
  t('an archive story can be saved', saved.includes('old-story'), JSON.stringify(saved));
  const f0=await pg.evaluate(()=>window.__slugFetches);
  await pg.evaluate(()=>{ location.hash='#/'; }); await pg.waitForTimeout(250);
  await pg.evaluate(()=>{ location.hash='#/story/old-story'; }); await pg.waitForTimeout(350);
  t('second open costs no extra request', (await pg.evaluate(()=>window.__slugFetches))===f0 && (await pg.locator('#story-body').innerText()).includes('cocoa accord'));
  // a slug that does not exist
  await pg.evaluate(()=>{ location.hash='#/story/no-such-story'; }); await pg.waitForTimeout(600);
  t('unknown story says so instead of hanging', (await pg.locator('#story-body').innerText()).includes('Story not available'));
  // offline: an unfetched story fails fast, an edition story still opens
  await ctx.setOffline(true);
  await pg.evaluate(()=>{ location.hash='#/story/another-old-one'; }); await pg.waitForTimeout(400);
  t('offline: unknown story fails fast with a message', (await pg.locator('#story-body').innerText()).includes('Story not available'));
  await pg.evaluate(()=>{ location.hash='#/story/e1'; }); await pg.waitForTimeout(300);
  t('offline: edition stories still open', (await pg.locator('#story-body').innerText()).includes('Accra summit'));
  t('no JS errors', errs.length===0, errs[0]||'');
  await ctx.close(); }

// 2 · a saved story that has left the edition and the server still opens from its saved copy
{ const ctx=await br.newContext({viewport:{width:390,height:800}}); const pg=await ctx.newPage();
  await pg.addInitScript(SEED, JSON.stringify([{slug:'gone-story',headline:'Saved long ago: Kigali fintech',dek:'Saved dek.',body:['Saved body text.'],vertical:'tech',region:'east-africa',byline:'',tags:[],published_at:new Date(NOW-90*24*H).toISOString(),translations:null,saved_at:NOW}]));
  await pg.goto(base+'#/saved',{waitUntil:'networkidle'}); await pg.waitForTimeout(500);
  await pg.click('#saved-body a.card'); await pg.waitForTimeout(400);
  const txt=await pg.locator('#story-body').innerText();
  t('saved story opens from its saved copy', txt.includes('Kigali fintech') && txt.includes('Saved body text.'), txt.slice(0,120));
  await ctx.close(); }

await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
