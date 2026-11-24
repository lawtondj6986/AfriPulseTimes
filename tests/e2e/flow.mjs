import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
const LONG=Array.from({length:14},(_,i)=>'Paragraph '+(i+1)+'. '+'The continent moves forward with steady purpose and determination across markets and towns. '.repeat(3));
function mk(slug,h,v){return {slug,status:'published',published_at:'2026-11-23T08:00:00Z',payload:{slug,headline:h,vertical:v,standfirst:'A standfirst.',body:LONG}};}
const ROWS=[mk('a1','Kenya rail line opens','markets'),mk('a2','Nairobi tech hub expands','tech'),mk('a3','Accra hosts summit','politics')];
const CFG=`const ROWS=${JSON.stringify(ROWS)};function q(){const p={select(){return p},eq(){return p},order(){return p},limit(){return p},then(r){return r({data:ROWS,error:null})}};return p}const m={from(){return q()}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const br=await chromium.launch(LAUNCH);
const pg=await (await br.newContext({viewport:{width:390,height:800}})).newPage();
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.addInitScript(()=>{ try{ localStorage.setItem('afripulse_welcomed','1'); }catch(e){} });
await pg.goto(`http://127.0.0.1:${srv.address().port}/reader.html`,{waitUntil:'networkidle'});
await pg.waitForTimeout(600);
const R=[]; function t(n,ok,d){ R.push([n,ok,d]); }

// bar hidden on Today
t('readbar hidden on Today', await pg.locator('#readbar').isHidden());

// open a story
await pg.evaluate(()=>{ location.hash='#/story/a1'; });
await pg.waitForTimeout(300);
t('readbar active on a story', await pg.evaluate(()=>!document.getElementById('readbar').hidden));
const w0=await pg.evaluate(()=>parseFloat(document.getElementById('readbar').style.width)||0);
await pg.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
await pg.waitForTimeout(250);
const w1=await pg.evaluate(()=>parseFloat(document.getElementById('readbar').style.width)||0);
t('bar fills as you scroll', w1>w0 && w1>90, w0+' → '+w1);

// Up next card exists, points at a different unread story
const nxTxt=await pg.locator('.nextup').innerText();
const nxHref=await pg.locator('.nextup a.card').getAttribute('href');
t('Up next present, different story', /up next/i.test(nxTxt) && !nxHref.includes('a1'), nxHref+' · '+nxTxt.slice(0,40));
t('edition progress 1 of 3', nxTxt.includes('1 of 3') || nxTxt.includes('read 1 of 3'), nxTxt.slice(-120));

// click through → next story renders, progress becomes 2 of 3
await pg.click('.nextup a.card');
await pg.waitForTimeout(300);
const h=await pg.evaluate(()=>location.hash);
const nxTxt2=await pg.locator('.nextup').innerText();
t('tapping Up next opens the next story', h.includes('story/')&&!h.includes('a1'), h);
t('edition progress advances (2 of 3)', nxTxt2.includes('2 of 3'), nxTxt2.slice(-120));

// skip-read logic: next from a2 should be a3 (a1 already read)
const href2=await pg.locator('.nextup a.card').getAttribute('href');
t('Up next skips already-read stories', href2.includes('a3'), href2);

// back to Today → bar hides
await pg.evaluate(()=>{ location.hash='#/'; });
await pg.waitForTimeout(250);
t('readbar hides again on Today', await pg.locator('#readbar').isHidden());

// screenshot of the story tail for the reveal
await pg.evaluate(()=>{ location.hash='#/story/a3'; });
await pg.waitForTimeout(300);
await pg.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
await pg.waitForTimeout(250);
const pg2=await (await br.newContext({viewport:{width:390,height:700},deviceScaleFactor:2})).newPage();
await pg2.addInitScript(st=>{ try{ localStorage.setItem('afripulse_welcomed','1'); localStorage.setItem('afripulse_reads',st); }catch(e){} },
  await pg.evaluate(()=>localStorage.getItem('afripulse_reads')));
await pg2.goto(`http://127.0.0.1:${srv.address().port}/reader.html#/story/a2`,{waitUntil:'networkidle'});
await pg2.waitForTimeout(400);
await pg2.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
await pg2.waitForTimeout(300);
await pg2.screenshot({path:shot('flow-shot.png')});

t('no JS errors', errs.length===0, errs[0]||'');
await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
