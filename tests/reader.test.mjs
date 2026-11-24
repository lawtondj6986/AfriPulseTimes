// Tests for the lite reader PWA (public/reader.html) and the Phase 6 wiring
// that routes phones to the reader while keeping the newsroom desk at /desk.
//
//  1. the reader's inline JavaScript parses (no syntax errors),
//  2. every reader-UI string (the T table) exists in all five languages, and
//     %-placeholders are consistent across languages,
//  3. every tr('key') the reader references exists in T,
//  4. the service worker ships the v2 reader shell (and still knows the desk),
//  5. /, the manifest, and vercel.json point phones at the reader, and
//  6. the newsroom desk is untouched (still its own SPA, reachable at /desk).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const read = (p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8');
const reader = read('../public/reader.html');
const LANGS = ['en', 'fr', 'ar', 'sw', 'pt'];

function inlineScript(html) {
  // Executable scripts only — skip data blocks such as application/ld+json.
  const re = /<script((?:\s[^>]*)?)>([\s\S]*?)<\/script>/g;
  let m, all = '';
  while ((m = re.exec(html))) {
    if (/type\s*=\s*["'](?!(?:text\/javascript|module)["'])/i.test(m[1])) continue;
    all += '\n' + m[2];
  }
  return all;
}

test('reader inline JavaScript parses without syntax errors', () => {
  const code = inlineScript(reader);
  assert.ok(code.length > 10000, 'expected substantial inline script');
  assert.doesNotThrow(() => new vm.Script(code, { filename: 'reader-inline.js' }));
});

function extractT() {
  const start = reader.indexOf('var T = {');
  assert.ok(start > -1, 'T table not found');
  const end = reader.indexOf('// ── Vertical', start);
  assert.ok(end > start, 'end of T table not found');
  const block = reader.slice(start, end);
  const objEnd = block.lastIndexOf('};');
  const src = block.slice(0, objEnd + 1); // "var T = { ... }"
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(src + '\n; this.T = T;', ctx);
  return ctx.T;
}

test('every reader string exists in all five languages', () => {
  const T = extractT();
  const keys = Object.keys(T);
  assert.ok(keys.length > 20, 'expected many reader strings');
  const missing = [];
  for (const k of keys) for (const l of LANGS) if (!(l in T[k])) missing.push(`${l}:${k}`);
  assert.deepEqual(missing, [], `missing translations: ${missing.join(', ')}`);
});

test('placeholder tokens are consistent across languages', () => {
  const T = extractT();
  const bad = [];
  for (const k of Object.keys(T)) {
    const toks = (s) => (String(s).match(/%[a-z]+/g) || []).sort().join(',');
    const want = toks(T[k].en);
    for (const l of LANGS) if (toks(T[k][l]) !== want) bad.push(`${k}:${l}`);
  }
  assert.deepEqual(bad, [], `inconsistent placeholders: ${bad.join(', ')}`);
});

test('every tr() key the reader uses exists in T', () => {
  const T = extractT();
  const re = /\btr\('([a-z0-9_]+)'/g;
  const used = new Set();
  let m;
  while ((m = re.exec(reader))) used.add(m[1]);
  const missing = [...used].filter((k) => !(k in T));
  assert.deepEqual(missing, [], `tr() keys missing from T: ${missing.join(', ')}`);
});

test('service worker ships the v2 reader shell and knows the desk', () => {
  const sw = read('../public/sw.js');
  assert.match(sw, /VERSION\s*=\s*'ap-v9'/, 'SW VERSION should be ap-v9');
  assert.match(sw, /READER_SHELL\s*=\s*'\/reader\.html'/, 'reader shell missing');
  assert.match(sw, /DESK_SHELL\s*=\s*'\/afripulse-preview\.html'/, 'desk shell missing');
  // The reader shell is precached; the heavy newsroom is NOT in the precache list.
  const pre = sw.slice(sw.indexOf('PRECACHE'), sw.indexOf('];', sw.indexOf('PRECACHE')));
  assert.ok(pre.includes('READER_SHELL'), 'reader shell should be precached');
  assert.ok(!pre.includes('DESK_SHELL'), 'desk should not be precached (lazy)');
});

test('/, manifest, and vercel point phones at the reader', () => {
  const index = read('../index.html');
  assert.match(index, /location\.replace\('\/reader\.html'/, 'index should redirect to reader');

  const manifest = JSON.parse(read('../public/manifest.webmanifest'));
  assert.match(manifest.start_url, /^\/reader\.html/, 'manifest start_url should be reader');

  const vercel = JSON.parse(read('../vercel.json'));
  const hasDesk = (vercel.rewrites || []).some(
    (r) => r.source === '/desk' && r.destination === '/afripulse-preview.html'
  );
  assert.ok(hasDesk, '/desk rewrite to the newsroom missing');
  const revalidates = (vercel.headers || []).some((h) => /reader\.html/.test(h.source));
  assert.ok(revalidates, 'reader.html should be in the revalidate header group');
});

test('newsroom desk is intact (unchanged full SPA)', () => {
  const desk = read('../public/afripulse-preview.html');
  assert.ok(desk.length > 300000, 'newsroom should still be the full SPA');
  assert.match(desk, /#\/admin/, 'newsroom admin route missing');
});

// ── Heritage Days calendar ────────────────────────────────────
test('NATDAYS covers all 54 nations exactly once, with valid dates', () => {
  const start = reader.indexOf('var NATDAYS=[');
  assert.ok(start > -1, 'NATDAYS table not found');
  const end = reader.indexOf('];', start);
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(reader.slice(start, end + 2) + '\n; this.N = NATDAYS;', ctx);
  const N = ctx.N;
  assert.equal(N.length, 54, 'one entry per African nation');
  const codes = N.map((r) => r[2]);
  assert.equal(new Set(codes).size, 54, 'no duplicate countries');
  const daysIn = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for (const [m, d, cc, y, t] of N) {
    assert.ok(m >= 1 && m <= 12 && d >= 1 && d <= daysIn[m - 1], `bad date ${cc}`);
    assert.match(cc, /^[A-Z]{2}$/, `bad ISO code ${cc}`);
    assert.ok(y >= 1847 && y <= 2011, `implausible year ${cc}:${y}`);
    assert.ok(['i', 'n', 'f', 'r'].includes(t), `bad type ${cc}:${t}`);
  }
  // spot checks against well-known anniversaries
  const by = Object.fromEntries(N.map((r) => [r[2], r]));
  assert.equal(JSON.stringify(by.KE.slice(0, 2)), '[12,12]', 'Kenya — Jamhuri Day');
  assert.equal(JSON.stringify(by.NG.slice(0, 2)), '[10,1]', 'Nigeria — Oct 1');
  assert.equal(JSON.stringify(by.GH.slice(0, 2)), '[3,6]', 'Ghana — Mar 6');
  assert.equal(by.ZA[4], 'f', 'South Africa is Freedom Day');
  assert.equal(by.LR[3], 1847, 'Liberia 1847');
});

// ── 54 Nations: country detection ─────────────────────────────
function countryCtx() {
  const start = reader.indexOf('var COUNTRY_TERMS={');
  const end = reader.indexOf('function flagEmoji(', start);
  assert.ok(start > -1 && end > start, 'country matcher not found');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(reader.slice(start, end) + '\n; this.countriesIn = countriesIn; this.TERMS = COUNTRY_TERMS;', ctx);
  return ctx;
}
const cc = (ctx, s) => JSON.stringify(ctx.countriesIn(s).slice().sort());

test('country table covers all 54 nations', () => {
  const ctx = countryCtx();
  assert.equal(Object.keys(ctx.TERMS).length, 54);
});

test('country detection: lookalike names never cross-match', () => {
  const ctx = countryCtx();
  assert.equal(cc(ctx, 'Nigeria expands rail network'), '["NG"]');
  assert.equal(cc(ctx, 'Niger junta meets ECOWAS envoys'), '["NE"]');
  assert.equal(cc(ctx, 'Oil spill in the Niger Delta'), '["NG"]', 'Niger Delta is Nigeria');
  assert.equal(cc(ctx, 'Flooding along the Niger River'), '[]', 'the river is no single country');
  assert.equal(cc(ctx, 'Guinea holds referendum'), '["GN"]');
  assert.equal(cc(ctx, 'Equatorial Guinea signs gas deal'), '["GQ"]');
  assert.equal(cc(ctx, 'Guinea-Bissau votes'), '["GW"]');
  assert.equal(cc(ctx, 'Piracy in the Gulf of Guinea'), '[]');
  assert.equal(cc(ctx, 'Papua New Guinea quake'), '[]');
  assert.equal(cc(ctx, 'South Sudan peace talks resume'), '["SS"]');
  assert.equal(cc(ctx, 'Sudan ceasefire holds in Khartoum'), '["SD"]');
  assert.equal(cc(ctx, 'DR Congo and Rwanda sign accord'), '["CD","RW"]');
  assert.equal(cc(ctx, 'Republic of Congo opens Brazzaville port'), '["CG"]');
  assert.equal(cc(ctx, 'Benin City traders protest'), '["NG"]', 'Benin City is in Nigeria');
  assert.equal(cc(ctx, 'Benin parliament passes budget'), '["BJ"]');
});

test('country detection: cities, aliases, accents, apostrophes and word boundaries', () => {
  const ctx = countryCtx();
  assert.equal(cc(ctx, 'Lagos markets rally'), '["NG"]');
  assert.equal(cc(ctx, 'Ivory Coast cocoa harvest'), '["CI"]');
  assert.equal(cc(ctx, 'Côte d’Ivoire cocoa harvest'), '["CI"]', 'curly apostrophe + accent');
  assert.equal(cc(ctx, 'Talks in Yaoundé continue'), '["CM"]');
  assert.equal(cc(ctx, 'Air route normalisation announced'), '[]', 'no Mali inside normalisation');
  assert.equal(cc(ctx, 'Somalia and Kenya, Ghana, Egypt meet'), '["EG","GH","KE","SO"]');
  assert.equal(cc(ctx, 'Global markets steady'), '[]');
});

// ── offline cache hygiene + measurement ───────────────────────
test('service worker never stores cross-origin photos or analytics', () => {
  const sw = read('../public/sw.js');
  assert.match(sw, /url\.origin !== self\.location\.origin && url\.hostname !== 'esm\.sh'\) return;/,
    'cross-origin assets must bypass Cache Storage (opaque responses cost megabytes of quota each)');
  assert.match(sw, /url\.pathname\.indexOf\('\/_vercel\/'\) === 0\) return;/);
  // the guard must sit before the cache-first step
  assert.ok(sw.indexOf("url.hostname !== 'esm.sh'") < sw.indexOf('cache-first, then network'));
});

test('reader is wired for cookie-less page-view analytics', () => {
  assert.match(reader, /<script defer src="\/_vercel\/insights\/script\.js" data-disable-auto-track="1"><\/script>/);
  assert.match(reader, /window\.va\('pageview',\{path:path\}\)/);
  assert.match(reader, /trackView\(h\);/, 'the router must report each view');
});

// ── the reader must stay light ────────────────────────────────
test('reader stays within its over-the-wire size budget', async () => {
  const { brotliCompressSync } = await import('node:zlib');
  const kb = brotliCompressSync(Buffer.from(reader)).length / 1024;
  // The reader is the app for low-end phones on metered data. Vercel serves it
  // Brotli-compressed; 60KB is a deliberate ceiling, not a target.
  assert.ok(kb < 60, `reader.html is ${kb.toFixed(1)}KB compressed — over the 60KB budget`);
});
