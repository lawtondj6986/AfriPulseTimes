import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
function mk(slug,h,v){return {slug,status:'published',published_at:'2026-11-23T08:00:00Z',payload:{slug,headline:h,vertical:v,standfirst:'Dek '+slug+'.',body:['Body.']}};}
const ROWS=[mk('a1','Kenya rail line opens','front'),mk('a2','Lagos markets rally','markets'),mk('a3','Kigali fintech round','tech')];
const CFG=`const ROWS=${JSON.stringify(ROWS)};function q(){const p={select(){return p},eq(){return p},order(){return p},limit(){return p},then(r){return r({data:ROWS,error:null})}};return p}const m={from(){return q()}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const br=await chromium.launch(LAUNCH);
const pg=await (await br.newContext({viewport:{width:390,height:800},hasTouch:true})).newPage();
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.addInitScript(()=>{ try{ localStorage.setItem('afripulse_welcomed','1'); }catch(e){} });
await pg.goto(`http://127.0.0.1:${srv.address().port}/reader.html`,{waitUntil:'networkidle'});
await pg.waitForTimeout(600);
const R=[]; function t(n,ok,d){ R.push([n,ok,d]); }
const SWIPE=`(a)=>{const [x1,y1,x2,y2]=a;
  const mk=(x,y)=>new Touch({identifier:1,target:document.body,clientX:x,clientY:y});
  document.body.dispatchEvent(new TouchEvent('touchstart',{touches:[mk(x1,y1)],bubbles:true}));
  document.body.dispatchEvent(new TouchEvent('touchend',{changedTouches:[mk(x2,y2)],touches:[],bubbles:true}));}`;

// swiping on Today does nothing
await pg.evaluate(eval(SWIPE),[300,400,80,405]); await pg.waitForTimeout(200);
t('swipe on Today is inert', (await pg.evaluate(()=>location.hash))==='#/' || (await pg.evaluate(()=>location.hash))==='');

// open the first story, swipe left → next unread
await pg.evaluate(()=>{ location.hash='#/story/a1'; }); await pg.waitForTimeout(300);
await pg.evaluate(eval(SWIPE),[300,400,80,405]); await pg.waitForTimeout(300);
const h1=await pg.evaluate(()=>location.hash);
t('swipe left opens the next unread story', h1.includes('a2'), h1);

// vertical-dominant drag must NOT navigate (it's a scroll)
await pg.evaluate(eval(SWIPE),[300,200,220,500]); await pg.waitForTimeout(200);
t('vertical drag never navigates', (await pg.evaluate(()=>location.hash)).includes('a2'));

// a timid nudge must not navigate either
await pg.evaluate(eval(SWIPE),[300,400,260,402]); await pg.waitForTimeout(200);
t('small nudge ignored', (await pg.evaluate(()=>location.hash)).includes('a2'));

// swipe right → back to the previous story
await pg.evaluate(eval(SWIPE),[90,400,320,405]); await pg.waitForTimeout(400);
t('swipe right goes back', (await pg.evaluate(()=>location.hash)).includes('a1'));

// read the remaining story, then the meter becomes a finish line
await pg.evaluate(()=>{ location.hash='#/story/a2'; }); await pg.waitForTimeout(250);
await pg.evaluate(()=>{ location.hash='#/story/a3'; }); await pg.waitForTimeout(300);
const prog=await pg.locator('.edprog').innerText();
t('finish line on completing the edition', prog.includes('Edition complete') && prog.includes('3'), prog);
const done=await pg.evaluate(()=>document.querySelector('.edprog').classList.contains('done'));
const barW=await pg.evaluate(()=>document.querySelector('.edbar i').style.width);
t('meter full and gilded', done && barW==='100%', done+' · '+barW);
await pg.screenshot({path:shot('momentum-shot.png'), clip:{x:0,y:220,width:390,height:560}});

t('no JS errors', errs.length===0, errs[0]||'');
await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
