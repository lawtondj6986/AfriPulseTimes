import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
function mk(slug,h,v,region,i){return {slug,region,status:'published',published_at:new Date(Date.now()-i*3600000).toISOString(),payload:{slug,headline:h,vertical:v,standfirst:'Dek.',body:['Body.']}};}
const ROWS=[mk('w1','West one','politics','west-africa',1),mk('c1','The cover story','front','north-africa',2),mk('w2','West two','markets','west-africa',3),
 mk('e1','East one','markets','east-africa',4),mk('t1','Tech one','tech','southern-africa',5),mk('e2','East two','politics','east-africa',6),
 mk('t2','Tech two','tech','west-africa',7),mk('s1','South one','culture','southern-africa',8),mk('s2','South two','sports','southern-africa',9)];
const CFG=`const ROWS=${JSON.stringify(ROWS)};function q(){const p={select(){return p},eq(){return p},order(){return p},limit(){return p},then(r){return r({data:ROWS,error:null})}};return p}const m={from(){return q()}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const base=`http://127.0.0.1:${srv.address().port}/reader.html`;
const br=await chromium.launch(LAUNCH);
const R=[]; function t(n,ok,d){ R.push([n,ok,d]); }
// A speech engine that, like some real browsers, fires "end" on the utterance it cancels.
const STUB=(o)=>{ window.__utts=[]; let cur=null, timer=null;
  try{ localStorage.setItem('afripulse_welcomed','1'); localStorage.setItem('afripulse_home_asked','1');
    if(o.home) localStorage.setItem('afripulse_home',o.home); if(o.favs) localStorage.setItem('afripulse_favs',o.favs); if(o.lang) localStorage.setItem('afripulse_lang',o.lang); }catch(e){}
  class U{ constructor(tx){ this.text=tx; this.onend=null; } }
  Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:U});
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{ getVoices(){ return []; }, pause(){}, resume(){},
    cancel(){ clearTimeout(timer); const u=cur; cur=null; if(u&&u.onend) u.onend(); },
    speak(u){ window.__utts.push({t:u.text,l:u.lang}); cur=u; timer=setTimeout(()=>{ if(cur===u){ cur=null; if(u.onend) u.onend(); } }, window.__slow?100000:60); } }}); };
async function open(o){ const ctx=await br.newContext({viewport:{width:390,height:800},deviceScaleFactor:2}); const pg=await ctx.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(STUB,o||{});
  await pg.goto(base+'#/listen',{waitUntil:'networkidle'}); await pg.waitForTimeout(600); return {ctx,pg,errs}; }
const queue=pg=>pg.evaluate(()=>[...document.querySelectorAll('#listen-body .qrow .qh')].map(e=>e.textContent));

{ const {ctx,pg}=await open({});
  const q=await queue(pg);
  t('default briefing: the cover first, then the edition in order, seven stories', q.length===7 && q[0]==='The cover story' && q[1]==='West one' && q[2]==='West two', JSON.stringify(q));
  await ctx.close(); }

{ const {ctx,pg,errs}=await open({home:'["east-africa"]',favs:'["tech"]'});
  const q=await queue(pg);
  t('personalised: cover, then home region, then favourite section', JSON.stringify(q.slice(0,5))==='["The cover story","East one","East two","Tech one","Tech two"]' && q.length===7, JSON.stringify(q));
  await pg.screenshot({path:shot('listen-shot.png'), clip:{x:0,y:0,width:390,height:560}});
  // play slowly, then skip twice: each skip advances exactly one story
  await pg.evaluate(()=>{ window.__slow=false; });
  await pg.click('#l-play'); await pg.waitForTimeout(120);          // intro (60ms) ends → story 1 starts
  await pg.evaluate(()=>{ window.__slow=true; });                    // hold on whatever is speaking next
  await pg.waitForTimeout(150);
  await pg.click('#l-next'); await pg.waitForTimeout(80);
  await pg.click('#l-next'); await pg.waitForTimeout(80);
  const said=await pg.evaluate(()=>window.__utts.map(u=>u.t.split('.')[0]));
  const stories=said.slice(1);
  const expect=['The cover story','East one','East two','Tech one','Tech two'];
  const inOrder=stories.every((s,i)=>s===expect[i]);
  t('skip moves forward one story at a time, never two', inOrder && stories.length>=3 && new Set(stories).size===stories.length, JSON.stringify(said));
  await pg.click('#l-stop'); await pg.waitForTimeout(80);
  const n=await pg.evaluate(()=>window.__utts.length); await pg.waitForTimeout(200);
  t('stop ends the briefing', (await pg.evaluate(()=>window.__utts.length))===n && (await pg.locator('#l-play').count())===1);
  // corrections link on a story
  await pg.evaluate(()=>{ location.hash='#/story/e1'; }); await pg.waitForTimeout(300);
  const href=await pg.locator('.fixline a').getAttribute('href');
  const u=new URL(href);
  t('“Tell the editors” opens a pre-filled correction email', u.protocol==='mailto:' && u.pathname==='hello@afripulsetimes.com' && u.searchParams.get('subject')==='Correction: East one' && u.searchParams.get('body').includes('/s/e1'), href);
  t('no JS errors', errs.length===0, errs[0]||'');
  await ctx.close(); }

{ const {ctx,pg}=await open({lang:'fr'});
  await pg.click('#l-play'); await pg.waitForTimeout(200);
  const u=await pg.evaluate(()=>window.__utts.slice(0,2).map(x=>x.l));
  t('French intro in a French voice; untranslated stories in an English voice', u[0]==='fr-FR' && u[1]==='en-GB', JSON.stringify(u));
  await ctx.close(); }

await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
