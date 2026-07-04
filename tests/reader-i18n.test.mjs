// Tests for the reader-UI i18n layer (RUI + rt) in public/afripulse-preview.html:
//  1. every RUI key has a non-empty string in ALL five languages, and
//  2. every rt('...') key referenced in the file exists in RUI.
// Keeps the five reader-UI languages from drifting out of alignment — the build
// fails if a single translation is missing or blank.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HTML_PATH = fileURLToPath(new URL('../public/afripulse-preview.html', import.meta.url));
const html = readFileSync(HTML_PATH, 'utf8');

function extractRUI() {
  const start = html.indexOf('const RUI = {');
  assert.ok(start > -1, 'RUI object not found');
  const end = html.indexOf('function rt(', start);
  assert.ok(end > start, 'rt() function not found after RUI');
  const src = html.slice(start, end).trim().replace('const RUI = ', 'RUI = ');
  const ctx = { RUI: undefined };
  vm.createContext(ctx);
  vm.runInContext(src + '\n; this.RUI = RUI;', ctx);
  return ctx.RUI;
}

const LANGS = ['en', 'fr', 'ar', 'sw', 'pt'];

test('every RUI key has a non-empty string in all five languages', () => {
  const RUI = extractRUI();
  const keys = Object.keys(RUI);
  assert.ok(keys.length > 80, `expected many reader-UI keys, got ${keys.length}`);

  const problems = [];
  for (const k of keys) {
    const row = RUI[k];
    for (const l of LANGS) {
      const v = row[l];
      if (typeof v !== 'string' || v.trim() === '') problems.push(`${l}:${k}`);
    }
  }
  assert.deepEqual(problems, [], `missing/blank reader-UI translations: ${problems.join(', ')}`);
});

test('placeholders (%s/%c/%v/%r) are consistent across all languages of a key', () => {
  const RUI = extractRUI();
  const problems = [];
  for (const k of Object.keys(RUI)) {
    const row = RUI[k];
    const want = (row.en.match(/%[a-z]/g) || []).slice().sort().join(',');
    for (const l of LANGS) {
      const got = (row[l].match(/%[a-z]/g) || []).slice().sort().join(',');
      if (got !== want) problems.push(`${k} (${l}: "${got}" vs en: "${want}")`);
    }
  }
  assert.deepEqual(problems, [], `placeholder mismatch: ${problems.join('; ')}`);
});

test('every rt(\'key\') referenced in the SPA exists in RUI', () => {
  const RUI = extractRUI();
  const keyRe = /\brt\('([a-z0-9_]+)'/g;
  const keys = new Set();
  let m;
  while ((m = keyRe.exec(html))) keys.add(m[1]);
  assert.ok(keys.size > 50, `expected many rt() keys, got ${keys.size}`);

  const missing = [];
  for (const k of keys) if (!(k in RUI)) missing.push(k);
  assert.deepEqual(missing, [], `rt() keys with no RUI entry: ${missing.join(', ')}`);
});
