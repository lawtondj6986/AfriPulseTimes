import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
const NOW=Date.now(),H=3600000;
function mk(slug,h,v,i){return {slug,status:'published',published_at:new Date(NOW-i*H).toISOString(),payload:{slug,headline:h,vertical:v,standfirst:'Dek.',body:['Body.']}};}
const ROWS=[mk('a1','Accra summit opens','front',1),mk('a2','Lagos bourse jumps','markets',2)];
const CFG=`const ROWS=${JSON.stringify(ROWS)};function q(){const p={select(){return p},eq(){return p},order(){return p},limit(){return p},then(r){return r({data:ROWS,error:null})}};return p}const m={from(){return q()}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const base=`http://127.0.0.1:${srv.address().port}/reader.html`;
const br=await chromium.launch(LAUNCH);
const R=[]; function t(n,ok,d){ R.push([n,ok,d]); }
async function open(o){ o=o||{}; const ctx=await br.newContext({viewport:{width:390,height:800},deviceScaleFactor:2}); const pg=await ctx.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); const posts=[];
  await pg.route('**/api/subscribe', route=>{ posts.push(JSON.parse(route.request().postData()||'{}'));
    return o.fail ? route.fulfill({status:502,contentType:'application/json',body:'{"ok":false}'}) : route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}); });
  await pg.addInitScript(l=>{ try{ localStorage.setItem('afripulse_welcomed','1'); localStorage.setItem('afripulse_home_asked','1'); if(l&&!localStorage.getItem('afripulse_lang')) localStorage.setItem('afripulse_lang',l); }catch(e){} },o.lang||'');
  await pg.goto(base,{waitUntil:'networkidle'}); await pg.waitForTimeout(600); return {ctx,pg,errs,posts}; }

{ const {ctx,pg,errs,posts}=await open();
  t('sign-up card sits at the foot of Today', (await pg.locator('#today-body form.nl').count())===1);
  await pg.fill('#today-body form.nl input','not-an-email'); await pg.click('#today-body form.nl button'); await pg.waitForTimeout(150);
  t('invalid address is caught before any request', posts.length===0 && (await pg.locator('#today-body .nlm').innerText()).includes('valid email'));
  // a draft survives the list re-rendering underneath it
  await pg.fill('#today-body form.nl input','  Reader@Example.com ');
  await pg.fill('#q','Accra'); await pg.waitForTimeout(200); await pg.fill('#q',''); await pg.waitForTimeout(250);
  t('typed address survives a re-render', (await pg.inputValue('#today-body form.nl input')).includes('Reader@Example.com'));
  await pg.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight)); await pg.waitForTimeout(100);
  await pg.screenshot({path:shot('newsletter-shot.png'), clip:{x:0,y:430,width:390,height:300}});
  await pg.click('#today-body form.nl button'); await pg.waitForTimeout(400);
  t('valid address is posted, trimmed and lower-cased, with the language', posts.length===1 && posts[0].email==='reader@example.com' && posts[0].language==='en', JSON.stringify(posts));
  t('success is confirmed in place', (await pg.locator('#today-body .nl.done').innerText()).includes('subscribed'));
  await pg.reload({waitUntil:'networkidle'}); await pg.waitForTimeout(500);
  t('once subscribed, Today stops asking', (await pg.locator('#today-body .nl').count())===0);
  await pg.evaluate(()=>{ location.hash='#/me'; }); await pg.waitForTimeout(300);
  t('Me shows the subscribed state', (await pg.locator('#me-body .nl.done').count())===1 && (await pg.locator('#me-body form.nl').count())===0);
  t('no JS errors', errs.length===0, errs[0]||'');
  await ctx.close(); }

{ const {ctx,pg,posts}=await open({fail:true});
  await pg.fill('#today-body form.nl input','a@b.co'); await pg.click('#today-body form.nl button'); await pg.waitForTimeout(400);
  const flag=await pg.evaluate(()=>localStorage.getItem('afripulse_subscribed'));
  t('server failure: clear message, form stays, nothing recorded', posts.length===1 && flag===null && (await pg.locator('#today-body .nlm').innerText()).includes('Could not subscribe') && !(await pg.locator('#today-body form.nl button').isDisabled()));
  await ctx.close(); }

{ const {ctx,pg,posts}=await open({lang:'fr'});
  const txt=await pg.locator('#today-body form.nl').innerText();
  await pg.evaluate(()=>{ location.hash='#/me'; }); await pg.waitForTimeout(300);
  await pg.fill('#me-body form.nl input','lecteur@exemple.fr'); await pg.click('#me-body form.nl button'); await pg.waitForTimeout(400);
  t('French card; sign-up from Me sends language fr', txt.includes('brief du matin') && posts.length===1 && posts[0].language==='fr', JSON.stringify(posts));
  await ctx.close(); }

await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
