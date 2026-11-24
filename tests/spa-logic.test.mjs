// Logic harness for the newsroom SPA (public/afripulse-preview.html).
//
// The SPA is a single inline-script file, so its core logic — region
// geo-matching, article normalisation, localisation, helpers — is extracted
// by source slice and executed in a vm with minimal stubs. These are the
// functions that decide where a story appears on the map, how a database row
// becomes an article, and what readers see in each language.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const src = readFileSync(
  fileURLToPath(new URL('../public/afripulse-preview.html', import.meta.url)), 'utf8');

function slice(startMarker, endMarker) {
  const i = src.indexOf(startMarker);
  assert.ok(i > -1, `marker not found: ${startMarker.slice(0, 40)}`);
  const j = src.indexOf(endMarker, i);
  assert.ok(j > i, `end marker not found: ${endMarker.slice(0, 40)}`);
  return src.slice(i, j);
}

function makeCtx(extra = {}) {
  const ctx = { Date, Object, Array, String, RegExp, Math, JSON, console, ...extra };
  vm.createContext(ctx);
  return ctx;
}

// ── region geo-matching ───────────────────────────────────────
const geoCtx = makeCtx();
vm.runInContext(
  slice('const REGIONS = {', '\nfunction byRegion') +
  '\n;this.REGIONS=REGIONS; this.articleGeoText=articleGeoText; this.textHasTerm=textHasTerm; this.articleMatchesRegion=articleMatchesRegion;',
  geoCtx);

test('geo: whole-word matching — no false hit for Mali inside "normalisation"', () => {
  assert.equal(geoCtx.articleMatchesRegion({ headline: 'Air route normalisation announced' }, 'west-africa'), false);
  assert.equal(geoCtx.articleMatchesRegion({ headline: 'Mali signs a new mining accord' }, 'west-africa'), true);
});

test('geo: capitals place a story (Nairobi → East Africa only)', () => {
  const a = { headline: 'Prices in Nairobi rise as rains return' };
  assert.equal(geoCtx.articleMatchesRegion(a, 'east-africa'), true);
  assert.equal(geoCtx.articleMatchesRegion(a, 'west-africa'), false);
  assert.equal(geoCtx.articleMatchesRegion(a, 'north-africa'), false);
});

test('geo: wire aliases count (Ivory Coast → West Africa)', () => {
  assert.equal(geoCtx.articleMatchesRegion({ headline: 'Ivory Coast cocoa harvest beats forecast' }, 'west-africa'), true);
});

test('geo: an explicit ingestion region tag wins without any text match', () => {
  assert.equal(geoCtx.articleMatchesRegion({ region: 'north-africa', headline: 'Markets update' }, 'north-africa'), true);
});

test('geo: unknown region slug is false, never a throw', () => {
  assert.equal(geoCtx.articleMatchesRegion({ headline: 'Cairo summit' }, 'atlantis'), false);
});

test('geo: text gathers headline, tags and body, and is cached on the article', () => {
  const a = { headline: 'H', tags: ['Ghana'], body: ['First para about Kigali.'] };
  const text = geoCtx.articleGeoText(a);
  assert.match(text, /ghana/);
  assert.match(text, /kigali/);
  assert.equal(a._geo, text, 'geo text should cache on the object');
  assert.equal(geoCtx.articleMatchesRegion(a, 'west-africa'), true);  // via tag
  assert.equal(geoCtx.articleMatchesRegion(a, 'east-africa'), true);  // via body
});

test('geo: textHasTerm respects word boundaries', () => {
  assert.equal(geoCtx.textHasTerm('niger delta pipeline', 'niger'), true);
  assert.equal(geoCtx.textHasTerm('nigeria expands rail', 'niger'), false);
});

// ── rowToArticle / localizeArticle ────────────────────────────
function articleCtx(lang) {
  const ctx = makeCtx({
    VDEF: { front: { emoji: '📰', color: '#111' }, markets: { emoji: '📈', color: '#222' } },
    CURRENT_LANG: lang
  });
  vm.runInContext(
    slice('function articleGeoText(a){', '\nconst _termRe') +
    slice('function rowToArticle(r){', '\n// --- async store') +
    '\n;this.rowToArticle=rowToArticle; this.localizeArticle=localizeArticle;',
    ctx);
  return ctx;
}

test('rowToArticle: the lossless payload wins, with slug/status/translations from the row', () => {
  const ctx = articleCtx('en');
  const a = ctx.rowToArticle({
    slug: 's1', status: 'published', published_at: '2026-11-20T08:00:00Z',
    translations: { fr: { headline: 'FR' } },
    payload: { headline: 'Payload headline', vertical: 'markets', kicker: 'K', body: ['p1'] }
  });
  assert.equal(a.headline, 'Payload headline');
  assert.equal(a.slug, 's1');
  assert.equal(a.status, 'published');
  assert.equal(a.publishedAt, '2026-11-20T08:00:00Z');
  assert.equal(a.translations.fr.headline, 'FR');
});

test('rowToArticle: typed-column fallback fills newsroom defaults', () => {
  const ctx = articleCtx('en');
  const a = ctx.rowToArticle({
    slug: 's2', vertical: 'markets', headline: 'H', dek: 'D',
    body: 'one\n\ntwo', hero_image: 'https://img/x.jpg', status: 'published'
  });
  assert.equal(a.byline, 'AfriPulse Bureau');
  // vm realm: compare by value, not by Array/Object prototype identity
  assert.equal(JSON.stringify(a.body), JSON.stringify(['one', 'two']));
  assert.equal(JSON.stringify(a.media), JSON.stringify({ type: 'image', src: 'https://img/x.jpg' }));
  assert.equal(a.emoji, '📈');
  assert.equal(a.source, 'authored');
});

test('localizeArticle: English pass-through is the same object', () => {
  const ctx = articleCtx('en');
  const a = { headline: 'H', translations: { fr: { headline: 'FR' } } };
  assert.equal(ctx.localizeArticle(a), a);
});

test('localizeArticle: French swap keeps fallbacks and the English geo text', () => {
  const ctx = articleCtx('fr');
  const a = {
    headline: 'Kenya launches rail line', standfirst: 'EN stand', kicker: 'K', body: ['en'],
    translations: { fr: { headline: 'Le Kenya lance une ligne', body: [] } }
  };
  const fr = ctx.localizeArticle(a);
  assert.equal(fr.headline, 'Le Kenya lance une ligne');
  assert.equal(fr.standfirst, 'EN stand');           // missing field falls back
  assert.deepEqual(fr.body, ['en']);                  // empty translation body falls back
  assert.match(fr._geo, /kenya/);                     // map placement stays English
});

test('localizeArticle: untranslated article is returned unchanged', () => {
  const ctx = articleCtx('ar');
  const a = { headline: 'H', translations: { fr: { headline: 'FR' } } };
  assert.equal(ctx.localizeArticle(a), a);
});

// ── helpers: slugify / timeAgo ────────────────────────────────
function helperCtx(lang) {
  const ctx = makeCtx({ CURRENT_LANG: lang });
  vm.runInContext(
    slice('function slugify(s){', '\nfunction getArticle') +
    '\n;this.slugify=slugify; this.timeAgo=timeAgo;', ctx);
  return ctx;
}

test('slugify: lowercases, dashes, trims, caps at 72, never empty', () => {
  const ctx = helperCtx('en');
  assert.equal(ctx.slugify('  Cocoa & Gold — Surge! '), 'cocoa-gold-surge');
  assert.equal(ctx.slugify('x'.repeat(100)).length, 72);
  assert.match(ctx.slugify(''), /^story-\d+$/);
});

test('timeAgo: minutes, hours and days in English; Arabic unit variant', () => {
  const en = helperCtx('en');
  const now = Date.now();
  assert.equal(en.timeAgo(new Date(now - 30 * 1000).toISOString()), 'just now');
  assert.equal(en.timeAgo(new Date(now - 5 * 60000).toISOString()), '5m ago');
  assert.equal(en.timeAgo(new Date(now - 3 * 3600000).toISOString()), '3h ago');
  assert.equal(en.timeAgo(new Date(now - 49 * 3600000).toISOString()), '2d ago');
  const ar = helperCtx('ar');
  assert.match(ar.timeAgo(new Date(now - 5 * 60000).toISOString()), /^5 د$/);
});
