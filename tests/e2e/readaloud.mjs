import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
function mk(slug,h,v){return {slug,status:'published',published_at:'2026-11-23T08:00:00Z',payload:{slug,headline:h,vertical:v,standfirst:'A crisp standfirst.',body:['Para one.','Para two.','Para three.']}};}
const ROWS=[mk('a1','Kenya rail line opens','markets'),mk('a2','Accra hosts summit','politics')];
ROWS[1].translations={fr:{headline:'Accra accueille un sommet',standfirst:'Un chapeau.',body:['Premier paragraphe.']}};
const CFG=`const ROWS=${JSON.stringify(ROWS)};function q(){const p={select(){return p},eq(){return p},order(){return p},limit(){return p},then(r){return r({data:ROWS,error:null})}};return p}const m={from(){return q()}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const base=`http://127.0.0.1:${srv.address().port}/reader.html`;
const br=await chromium.launch(LAUNCH);
const R=[]; function t(n,ok,d){ R.push([n,ok,d]); }
const STUB=()=>{
  window.__utts=[]; window.__cancels=0; window.__halt=false;
  try{ localStorage.setItem('afripulse_welcomed','1'); }catch(e){}
  class U{ constructor(tx){ this.text=tx; this.onend=null; } }
  Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:U});
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
    getVoices(){ return [{lang:'en-GB'},{lang:'fr-FR'}]; },
    cancel(){ window.__cancels++; window.__halt=true; },
    speak(u){ window.__utts.push({t:u.text,l:u.lang}); window.__halt=false;
      setTimeout(()=>{ if(!window.__halt && u.onend) u.onend(); },15); },
    pause(){}, resume(){}
  }});
};

// 1 · full playthrough in English
{ const ctx=await br.newContext({viewport:{width:390,height:800},deviceScaleFactor:2});
  const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(STUB);
  await pg.goto(base+'#/story/a1',{waitUntil:'networkidle'}); await pg.waitForTimeout(500);
  t('read button on the story page', await pg.locator('#read-btn').isVisible());
  await pg.screenshot({path:shot('readaloud-shot.png'), clip:{x:0,y:0,width:390,height:430}});
  await pg.click('#read-btn');
  const label=await pg.evaluate(()=>document.getElementById('read-btn').textContent);
  t('button flips to Stop while speaking', label.includes('Stop'), label);
  await pg.waitForTimeout(400);
  const utts=await pg.evaluate(()=>window.__utts);
  t('speaks headline → standfirst → paragraphs', utts.length===5 && utts[0].t.includes('Kenya rail') && utts[1].t.includes('standfirst') && utts[4].t==='Para three.', JSON.stringify(utts.map(u=>u.t)));
  t('utterances carry the reader language', utts.every(u=>u.l==='en-GB'), utts[0]&&utts[0].l);
  const label2=await pg.locator('#read-btn').innerText();
  t('button restores when the story ends', label2.includes('Read this'), label2);
  // 2 · tap again to stop mid-read
  await pg.click('#read-btn'); await pg.waitForTimeout(20);
  const c0=await pg.evaluate(()=>window.__cancels);
  await pg.click('#read-btn'); await pg.waitForTimeout(100);
  const c1=await pg.evaluate(()=>window.__cancels);
  const n0=await pg.evaluate(()=>window.__utts.length);
  await pg.waitForTimeout(300);
  const n1=await pg.evaluate(()=>window.__utts.length);
  t('second tap stops the voice', c1>c0 && n1===n0 && (await pg.locator('#read-btn').innerText()).includes('Read this'), c0+'→'+c1+' · '+n0+'/'+n1);
  // 3 · navigating away silences it
  await pg.click('#read-btn'); await pg.waitForTimeout(20);
  const c2=await pg.evaluate(()=>window.__cancels);
  await pg.evaluate(()=>{ location.hash='#/'; }); await pg.waitForTimeout(150);
  const c3=await pg.evaluate(()=>window.__cancels);
  const n2=await pg.evaluate(()=>window.__utts.length);
  await pg.waitForTimeout(300);
  const n3=await pg.evaluate(()=>window.__utts.length);
  t('leaving the story silences it', c3>c2 && n3===n2, c2+'→'+c3);
  t('no JS errors', errs.length===0, errs[0]||'');
  await ctx.close(); }

// 4 · French voice + label
{ const ctx=await br.newContext({viewport:{width:390,height:800}});
  const pg=await ctx.newPage();
  await pg.addInitScript(STUB);
  await pg.addInitScript(()=>{ try{ localStorage.setItem('afripulse_lang','fr'); }catch(e){} });
  await pg.goto(base+'#/story/a1',{waitUntil:'networkidle'}); await pg.waitForTimeout(500);
  const label=await pg.locator('#read-btn').innerText();
  await pg.click('#read-btn'); await pg.waitForTimeout(120);
  const utts=await pg.evaluate(()=>window.__utts);
  t('untranslated story is read as English, even in French', label.includes('voix haute') && utts.length>0 && utts[0].l==='en-GB', label+' · '+(utts[0]&&utts[0].l));
  await pg.evaluate(()=>{ window.__utts=[]; location.hash='#/story/a2'; }); await pg.waitForTimeout(300);
  await pg.click('#read-btn'); await pg.waitForTimeout(120);
  const u2=await pg.evaluate(()=>window.__utts);
  t('translated story is read in French', u2.length>0 && u2[0].l==='fr-FR' && u2[0].t.includes('Accra accueille'), JSON.stringify(u2[0]));
  await ctx.close(); }

// 5 · phones without speech synthesis get no dead button
{ const ctx=await br.newContext({viewport:{width:390,height:800}});
  const pg=await ctx.newPage();
  await pg.addInitScript(()=>{
    try{ localStorage.setItem('afripulse_welcomed','1'); }catch(e){}
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:undefined});
    Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:undefined});
  });
  await pg.goto(base+'#/story/a1',{waitUntil:'networkidle'}); await pg.waitForTimeout(500);
  t('no button when speech is unsupported', (await pg.locator('#read-btn').count())===0);
  await ctx.close(); }

await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
