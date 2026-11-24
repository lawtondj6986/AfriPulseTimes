import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
function mk(slug,h,v,d){return {slug,status:'published',published_at:'2026-11-2'+d+'T08:00:00Z',payload:{slug,headline:h,vertical:v,standfirst:'x',body:['b']}};}
const ROWS=[mk('a','Ruto and Tshisekedi restore full Kenya–DR Congo diplomatic relations','politics','3'),
 mk('b','Lagos markets rally as cocoa exports hit a record high for the season','markets','2'),
 mk('c','COP31 ends without a climate deal after fossil-fuel standoff','front','1'),
 mk('d','TechCabal: Dangote’s refinery encore reshapes West African fuel trade','tech','0'),
 mk('e','Flamingos flourish: Nigeria’s U-17 girls make history','sports','0')];
const CFG=`const ROWS=${JSON.stringify(ROWS)};function q(){const p={select(){return p},eq(){return p},order(){return p},limit(){return p},then(r){return r({data:ROWS,error:null})}};return p}const m={from(){return q()}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const br=await chromium.launch(LAUNCH);
const pg=await (await br.newContext({viewport:{width:390,height:800}})).newPage();
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.addInitScript(()=>{
  window.__shared=null;try{localStorage.setItem('afripulse_welcomed','1');}catch(e){}
  Object.defineProperty(navigator,'canShare',{configurable:true,value:(d)=>!!(d&&d.files&&d.files.length)});
  Object.defineProperty(navigator,'share',{configurable:true,value:async(d)=>{ const f=d.files[0];
    const buf=await f.arrayBuffer();
    window.__shared={name:f.name,type:f.type,size:buf.byteLength,
      b64:btoa(Array.from(new Uint8Array(buf)).map(c=>String.fromCharCode(c)).join(''))};
  }});
});
await pg.goto(`http://127.0.0.1:${srv.address().port}/reader.html`,{waitUntil:'networkidle'});
await pg.waitForTimeout(700);
const R=[];
R.push(['front-page button visible with stories', (await pg.locator('#fp-btn').getAttribute('class')).includes('show')]);
R.push(['button localized (icon on phones, full label for assistive tech)', (await pg.locator('#fp-btn').getAttribute('aria-label')).includes('front page')]);
await pg.click('#fp-btn');
await pg.waitForFunction(()=>!!window.__shared,null,{timeout:6000}).catch(()=>{});
const shared=await pg.evaluate(()=>window.__shared);
R.push(['share sheet got a PNG file', !!shared && shared.type==='image/png' && shared.name==='afripulse-front-page.png']);
R.push(['image is substantial (>40KB)', !!shared && shared.size>40000, shared&&shared.size]);
if(shared) fs.writeFileSync(shot('frontpage-card.png'), Buffer.from(shared.b64,'base64'));
R.push(['no JS errors', errs.length===0, errs[0]||'']);
await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
