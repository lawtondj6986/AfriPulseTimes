// Tests for the single-file SPA (public/afripulse-preview.html):
//  1. the inline JavaScript parses (no syntax errors), and
//  2. every t('...') translation key referenced exists in EN, FR, and AR.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HTML_PATH = fileURLToPath(new URL('../public/afripulse-preview.html', import.meta.url));
const html = readFileSync(HTML_PATH, 'utf8');

function inlineScript() {
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m, all = '';
  while ((m = re.exec(html))) all += '\n' + m[1];
  return all;
}

test('inline SPA JavaScript parses without syntax errors', () => {
  const code = inlineScript();
  assert.ok(code.length > 10000, 'expected substantial inline script');
  // new vm.Script parses/compiles without executing — throws on any syntax error.
  assert.doesNotThrow(() => new vm.Script(code, { filename: 'afripulse-inline.js' }));
});

test('every translation key resolves in EN, FR, and AR', () => {
  const start = html.indexOf('const LANG = {');
  assert.ok(start > -1, 'LANG object not found');
  const end = html.indexOf('function t(', start);
  const src = html.slice(start, end).trim().replace('const LANG = ', 'LANG = ');

  let LANG;
  const ctx = { LANG: undefined };
  vm.createContext(ctx);
  vm.runInContext(src + '\n; this.LANG = LANG;', ctx);
  LANG = ctx.LANG;

  const langs = ['en', 'fr', 'ar', 'sw', 'pt'];
  for (const l of langs) assert.ok(LANG[l], `missing language block: ${l}`);

  const keyRe = /\bt\('([a-z0-9_]+)'\)/g;
  const keys = new Set();
  let m;
  while ((m = keyRe.exec(html))) keys.add(m[1]);
  assert.ok(keys.size > 50, 'expected many translation keys');

  const missing = [];
  for (const k of keys) {
    for (const l of langs) {
      if (!(k in LANG[l])) missing.push(`${l}:${k}`);
    }
  }
  assert.deepEqual(missing, [], `missing translation keys: ${missing.join(', ')}`);
});
