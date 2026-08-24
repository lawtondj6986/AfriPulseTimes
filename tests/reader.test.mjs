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
  const re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g;
  let m, all = '';
  while ((m = re.exec(html))) all += '\n' + m[1];
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
  assert.match(sw, /VERSION\s*=\s*'ap-v2'/, 'SW VERSION should be ap-v2');
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
