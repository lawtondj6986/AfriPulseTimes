import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
const NOW=Date.now(),H=3600000;
function mk(slug,h,v,i,img,extra){return Object.assign({slug,hero_image:img||null,status:'published',published_at:new Date(NOW-i*H).toISOString(),payload:Object.assign({slug,headline:h,vertical:v,standfirst:'A standfirst that explains why this matters today.',body:['Body paragraph one.','Body paragraph two.']},extra||{})});}
const ROWS=[mk('p1','Cocoa exports hit a record as Lagos markets rally','front',1,'https://img.test/a.jpg?fit=1&amp;ssl=1',{media:{type:'image',src:'x',credit:'Premium Times'},source:'rss',sourceLabel:'Premium Times',sourceUrl:'https://ex.test/1'}),
 mk('p2','Nairobi bourse posts its best week','markets',2,'https://img.test/b.jpg'),
 mk('p3','Kigali fintech raises a new round','markets',3,'https://img.test/broken.jpg'),
 mk('p4','Accra budget passes parliament','politics',4,'http://img.test/insecure.jpg'),
 mk('p5','Dakar startup week opens','tech',5,null)];
const CFG=`const ROWS=${JSON.stringify(ROWS)};function q(){const p={select(){return p},eq(){return p},order(){return p},limit(){return p},then(r){return r({data:ROWS,error:null})}};return p}const m={from(){return q()}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const base=`http://127.0.0.1:${srv.address().port}/reader.html`;
const br=await chromium.launch(LAUNCH);
const R=[]; function t(n,ok,d){ R.push([n,ok,d]); }
// a real photo-like JPEG generated once via the browser
async function makeJpeg(){ const pg=await (await br.newContext({viewport:{width:800,height:450}})).newPage();
  await pg.setContent('<body style="margin:0;background:linear-gradient(135deg,#1E6B3A,#C9A227 60%,#7a3b12);height:450px"><div style="font:700 60px Georgia;color:#fff8;padding:160px 60px">photo</div></body>');
  const b=await pg.screenshot({type:'jpeg',quality:70}); await pg.context().close(); return b; }
const JPEG=await makeJpeg();
async function open(opts){ const ctx=await br.newContext(Object.assign({viewport:{width:390,height:800},deviceScaleFactor:2},opts.ctx||{})); const pg=await ctx.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); const reqs=[];
  await pg.route('https://img.test/**', route=>{ const u=route.request().url(); reqs.push(u);
    if(u.includes('broken')) return route.abort(); return route.fulfill({status:200,contentType:'image/jpeg',body:JPEG}); });
  await pg.addInitScript(o=>{ try{ localStorage.setItem('afripulse_welcomed','1'); localStorage.setItem('afripulse_home_asked','1'); if(o.ds) localStorage.setItem('afripulse_datasaver','1'); }catch(e){} },opts);
  await pg.goto(base+(opts.hash||''),{waitUntil:'networkidle'}); await pg.waitForTimeout(700); return {ctx,pg,errs,reqs}; }

{ const {ctx,pg,errs,reqs}=await open({});
  const hero=await pg.evaluate(()=>{ const i=document.querySelector('.hero .hp img'); return i?[i.getAttribute('src'),i.loading,i.referrerPolicy,i.alt,i.naturalWidth>0]:null; });
  t('cover carries its photo, URL decoded', hero && hero[0]==='https://img.test/a.jpg?fit=1&ssl=1' && hero[4]===true, JSON.stringify(hero));
  t('photos are lazy, private and decorative', hero && hero[1]==='lazy' && hero[2]==='no-referrer' && hero[3]==='');
  await pg.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight)); await pg.waitForTimeout(500);
  const th=await pg.evaluate(()=>[...document.querySelectorAll('#today-body a.card')].map(c=>[c.querySelector('h3').textContent.slice(0,8),c.classList.contains('has-th'),!!c.querySelector('.th img')]));
  const m=Object.fromEntries(th.map(x=>[x[0],x]));
  t('story card shows a thumbnail', m['Nairobi '][1] && m['Nairobi '][2], JSON.stringify(th));
  t('a photo that fails to load removes itself', !m['Kigali f'][1] && !m['Kigali f'][2]);
  t('insecure (http) photos are never used', !m['Accra bu'][2] && !reqs.some(u=>u.includes('insecure')));
  t('stories without a photo are unchanged', !m['Dakar st'][1]);
  await pg.evaluate(()=>window.scrollTo(0,340)); await pg.waitForTimeout(200);
  await pg.screenshot({path:shot('photos-shot.png')});
  await pg.evaluate(()=>{ location.hash='#/story/p1'; }); await pg.waitForTimeout(400);
  const fig=await pg.evaluate(()=>{ const f=document.querySelector('.st-fig'); return f?[!!f.querySelector('img'),f.querySelector('figcaption')&&f.querySelector('figcaption').textContent]:null; });
  t('story page shows the photo with its credit', fig && fig[0] && fig[1]==='Photo: Premium Times', JSON.stringify(fig));
  await pg.screenshot({path:shot('photos-story.png'), clip:{x:0,y:0,width:390,height:700}});
  await pg.evaluate(()=>{ location.hash='#/story/p3'; }); await pg.waitForTimeout(500);
  t('broken story photo leaves no empty frame or orphan credit', (await pg.locator('.st-fig').count())===0);
  t('no JS errors', errs.length===0, errs[0]||'');
  await ctx.close(); }

{ const {ctx,pg,reqs}=await open({ds:true});
  await pg.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight)); await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ location.hash='#/story/p1'; }); await pg.waitForTimeout(400);
  t('data saver: no photos and not one image request', (await pg.locator('#app img').count())===0 && reqs.length===0, 'reqs='+reqs.length);
  await ctx.close(); }

{ const {ctx,pg}=await open({ctx:{viewport:{width:1280,height:800},deviceScaleFactor:1}});
  await pg.screenshot({path:shot('photos-desktop.png')});
  await ctx.close(); }

await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
