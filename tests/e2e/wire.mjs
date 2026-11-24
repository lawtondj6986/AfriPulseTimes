import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
const NOW=Date.now(),H=3600000;
const S='The boat carrying mourners for a funeral overturned in southern Nigeria. It was the latest in a series of deadly boat accidents in the country.';
const ROWS=[
 {slug:'w1',status:'published',published_at:new Date(NOW-H).toISOString(),payload:{slug:'w1',headline:'Nigeria: At least 24 dead after boat capsizes',vertical:'front',standfirst:'[DW] '+S,body:['[DW] '+S],byline:'AllAfrica',source:'rss',sourceUrl:'https://allafrica.com/stories/1.html',sourceLabel:'AllAfrica'}},
 {slug:'w2',status:'published',published_at:new Date(NOW-2*H).toISOString(),payload:{slug:'w2',headline:'Kenya: Talks resume',vertical:'politics',standfirst:'[Capital FM] Talks resumed in Nairobi.',body:['[Capital FM] Talks resumed in Nairobi.','Delegates met for a second day.'],source:'rss',sourceUrl:'javascript:alert(1)',sourceLabel:'AllAfrica'}},
 {slug:'o1',status:'published',published_at:new Date(NOW-3*H).toISOString(),payload:{slug:'o1',headline:'Our own report [exclusive] on cocoa',vertical:'markets',standfirst:'An original standfirst.',body:['Original paragraph one.','Original paragraph two.'],byline:'Amina Yusuf'}}];
const CFG=`const ROWS=${JSON.stringify(ROWS)};function q(){const p={select(){return p},eq(){return p},order(){return p},limit(){return p},then(r){return r({data:ROWS,error:null})}};return p}const m={from(){return q()}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const br=await chromium.launch(LAUNCH);
const pg=await (await br.newContext({viewport:{width:390,height:800},deviceScaleFactor:2})).newPage();
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.addInitScript(()=>{ try{ localStorage.setItem('afripulse_welcomed','1'); localStorage.setItem('afripulse_home_asked','1'); }catch(e){} });
await pg.goto(`http://127.0.0.1:${srv.address().port}/reader.html`,{waitUntil:'networkidle'});
await pg.waitForTimeout(600);
const R=[]; function t(n,ok,d){ R.push([n,ok,d]); }

const today=await pg.locator('#today-body').innerText();
t('no raw [TAG] on Today', !today.includes('[DW]') && !today.includes('[Capital FM]'), today.slice(0,200));

await pg.evaluate(()=>{ location.hash='#/story/w1'; }); await pg.waitForTimeout(300);
const story=await pg.locator('#story-body').innerText();
const count=story.split('The boat carrying mourners').length-1;
t('summary shown exactly once, tag gone', count===1 && !story.includes('[DW]'), 'count='+count);
const src=await pg.locator('.srcbox').innerText();
t('source credit names origin and wire', src.includes('DW') && src.includes('AllAfrica'), src);
const link=await pg.evaluate(()=>{ const a=document.querySelector('.srcbox a'); return a?[a.href,a.target,a.rel]:null; });
t('full-report link opens the original safely', link && link[0]==='https://allafrica.com/stories/1.html' && link[1]==='_blank' && link[2].includes('noopener'), JSON.stringify(link));
await pg.screenshot({path:shot('wire-shot.png'), clip:{x:0,y:0,width:390,height:620}});

await pg.evaluate(()=>{ location.hash='#/story/w2'; }); await pg.waitForTimeout(300);
const s2=await pg.locator('#story-body').innerText();
t('second paragraph kept, duplicate dropped', s2.includes('Delegates met') && (s2.split('Talks resumed in Nairobi').length-1)===1);
t('unsafe source URL never becomes a link', (await pg.locator('.srcbox a').count())===0 && (await pg.locator('.srcbox').innerText()).includes('Capital FM'));

await pg.evaluate(()=>{ location.hash='#/story/o1'; }); await pg.waitForTimeout(300);
const s3=await pg.locator('#story-body').innerText();
t('original reporting untouched, no source box', s3.includes('[exclusive]') && s3.includes('Original paragraph two.') && (await pg.locator('.srcbox').count())===0);

t('no JS errors', errs.length===0, errs[0]||'');
await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
