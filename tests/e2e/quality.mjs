import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, ROOT, LAUNCH, shot } from './_env.mjs';
const NOW=Date.now(),H=3600000;
const CSS='/* Scoped resets */.tc-daily-wrapper * { box-sizing: border-box; }';
function wire(slug,h,v,i,dek,body,label){return {slug,status:'published',published_at:new Date(NOW-i*H).toISOString(),payload:{slug,headline:h,vertical:v,standfirst:dek,body:body||[dek],source:'rss',sourceLabel:label||'Al Jazeera',sourceUrl:'https://wire.example/'+slug}};}
const ROWS=[
 wire('es','Who is Alberto Feijoo, the conservative seeking to become Spain’s new PM?','front',1,'The former civil servant hopes to lead his party to victory.'),
 wire('rb','👨🏿‍🚀South Africa: South Africa News Briefs - November 23, 2026','front',1.5,'A digest of the day in South Africa.',null,'AllAfrica'),
 wire('ed','EDITORIAL: Sustaining the Flamingos’ flourish in Nigeria','opinions',10,'The Under-17 girls are worthy ambassadors.',null,'Premium Times'),
 wire('op','Makinde of Nigeria: Bride or side-chick?, By Wole Olaoye','opinions',11,'A bride is a woman on her wedding day.',null,'Premium Times'),
 wire('ng','Nigeria: At least 24 dead after boat capsizes','front',2,'The boat carrying mourners overturned in southern Nigeria.'),
 wire('ke','Kenya and DR Congo restore full diplomatic relations','politics',3,'The two presidents signed a joint communiqué in Nairobi.'),
 wire('mx','First images of Mexican cartel boss after arrest','culture',4,'First images of Mexican cartel boss after arrest'),
 wire('tc','TechCabal Daily: Lagos fintech roundup','tech',5,'In partnership with',['In partnership with','Lagos fintechs raised new rounds this week.']),
 wire('nw','The Next Wave: Kenya’s instant payment systems','tech',6,CSS,[CSS,'Kenya’s payment rails are maturing.']),
 wire('by','Bayelsa boat mishap: death toll rises, Tinubu approves N250mn','politics',8,'The president approved funds for the families of victims.',null,'Premium Times'),
 wire('af','Africa: COP31 cover deal collapses','politics',9,'Talks ended without agreement in Antalya.'),
 {slug:'own',status:'published',published_at:new Date(NOW-7*H).toISOString(),payload:{slug:'own',headline:'Our guide to the festive season',vertical:'culture',standfirst:'An original guide from the newsroom.',body:['Original paragraph.']}}
];
const CFG=`const ROWS=${JSON.stringify(ROWS)};function q(){const p={select(){return p},eq(){return p},order(){return p},limit(){return p},then(r){return r({data:ROWS,error:null})}};return p}const m={from(){return q()}};window.__supabase=m;if(window.__supabaseResolve)window.__supabaseResolve(m);`;
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/reader.html';
  if(p==='/supabase-config.js'){res.setHeader('content-type','text/javascript');return res.end(CFG);}
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){res.statusCode=404;return res.end('nf');}res.end(b);});});
await new Promise(r=>srv.listen(0,r));
const base=`http://127.0.0.1:${srv.address().port}/reader.html`;
const br=await chromium.launch(LAUNCH);
const R=[]; function t(n,ok,d){ R.push([n,ok,d]); }
async function open(lang){ const ctx=await br.newContext({viewport:{width:390,height:800},deviceScaleFactor:2}); const pg=await ctx.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(l=>{ try{ localStorage.setItem('afripulse_welcomed','1'); localStorage.setItem('afripulse_home_asked','1'); localStorage.setItem('afripulse_subscribed','1'); if(l&&!localStorage.getItem('afripulse_lang')) localStorage.setItem('afripulse_lang',l); }catch(e){} },lang||'');
  await pg.goto(base,{waitUntil:'networkidle'}); await pg.waitForTimeout(600); return {ctx,pg,errs}; }

{ const {ctx,pg,errs}=await open();
  const cover=await pg.locator('.hero h2').innerText();
  t('the newest story is foreign, yet an African story takes the cover', cover.includes('Nigeria'), cover);
  const world=await pg.evaluate(()=>[...document.querySelectorAll('#sec-world + .cards h3')].map(h=>h.textContent));
  t('world news is gathered in World', world.length===2 && world.some(h=>h.includes('Spain')) && world.some(h=>h.includes('Mexican')), JSON.stringify(world));
  const allText=await pg.evaluate(()=>[...document.querySelectorAll('#sec-politics + .cards h3')].map(h=>h.textContent).join(' | '));
  t('an African publisher’s story stays out of World even when it names no country; so does “Africa:”', allText.includes('Bayelsa') && allText.includes('COP31') && !world.some(h=>/Bayelsa|COP31/.test(h)), allText);
  const secs=await pg.evaluate(()=>[...document.querySelectorAll('#today-body .h2[id^="sec-"]')].map(h=>h.id.replace('sec-','')));
  t('World is the last section, after the paper’s own', secs[secs.length-1]==='world' && secs.includes('politics') && secs.includes('tech'), JSON.stringify(secs));
  const culture=await pg.evaluate(()=>[...document.querySelectorAll('#sec-culture + .cards h3')].map(h=>h.textContent));
  t('original reporting stays in its section even with no place named', culture.length===1 && culture[0].includes('festive season'), JSON.stringify(culture));
  const page=await pg.locator('#today-body').innerText();
  t('no leaked styling or sponsor lines on Today', !page.includes('box-sizing') && !page.includes('In partnership with'));
  const mx=await pg.evaluate(()=>{ const c=[...document.querySelectorAll('#today-body a.card')].find(c=>c.textContent.includes('Mexican')); return c?c.querySelectorAll('p').length:-1; });
  t('a summary that only repeats the headline is not shown', mx===0, 'p count '+mx);
  await pg.evaluate(()=>document.getElementById('sec-world').scrollIntoView({block:'center'})); await pg.waitForTimeout(150);
  await pg.screenshot({path:shot('quality-shot.png')});
  await pg.evaluate(()=>{ location.hash='#/story/nw'; }); await pg.waitForTimeout(300);
  const story=await pg.locator('#story-body').innerText();
  t('story page drops the junk and keeps the real paragraph', !story.includes('box-sizing') && story.includes('payment rails are maturing'));
  await pg.evaluate(()=>{ location.hash='#/listen'; }); await pg.waitForTimeout(300);
  const q=await pg.evaluate(()=>[...document.querySelectorAll('#listen-body .qrow .qh')].map(e=>e.textContent));
  const firstWorld=q.findIndex(h=>/Spain|Mexican/.test(h)), lastAfrica=Math.max(...q.map((h,i)=>/Spain|Mexican/.test(h)?-1:i));
  t('the briefing reads African stories before world news', q[0].includes('Nigeria') && (firstWorld===-1 || firstWorld>lastAfrica), JSON.stringify(q));
  await pg.evaluate(()=>{ location.hash='#/'; }); await pg.waitForTimeout(300);
  const heads=await pg.evaluate(()=>[...document.querySelectorAll('#today-body h2[dir], #today-body h3')].map(h=>h.textContent));
  t('a digest never takes the cover, even as the newest African front-page item', heads[0].includes('Nigeria: At least 24 dead'), heads[0]);
  t('headlines are tidied: no emoji, no doubled prefix, no trailing date, no shouting', heads.includes('South Africa News Briefs') && heads.includes('Editorial: Sustaining the Flamingos’ flourish in Nigeria') && !heads.some(h=>/👨|EDITORIAL|November 23, 2026/.test(h)), JSON.stringify(heads));
  await pg.evaluate(()=>{ location.hash='#/story/op'; }); await pg.waitForTimeout(300);
  const opH=await pg.locator('.st-h').innerText(), opMeta=await pg.locator('.st-meta').innerText();
  t('a column’s writer moves from the headline to the byline', opH==='Makinde of Nigeria: Bride or side-chick?' && opMeta.includes('Wole Olaoye'), opH+' | '+opMeta);
  t('no JS errors', errs.length===0, errs[0]||'');
  await ctx.close(); }

{ const {ctx,pg}=await open('fr');
  t('French: “Monde”', (await pg.locator('#sec-world').innerText()).toLowerCase()==='monde');
  await ctx.close(); }

await br.close(); srv.close();
let pass=0;for(const [n,ok,d] of R){console.log((ok?'PASS':'FAIL')+' · '+n+(ok?'':' → '+(d||'')));if(ok)pass++;}
console.log(pass+'/'+R.length);process.exit(pass===R.length?0:1);
