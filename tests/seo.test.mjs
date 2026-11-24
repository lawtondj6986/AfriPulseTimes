// Guards for the SEO / sharing layer: link-preview meta, crawler files,
// and the security headers — the things investors' and readers' link shares
// silently depend on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const p = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const read = (rel) => readFileSync(p(rel), 'utf8');

const SURFACES = ['../index.html', '../public/reader.html', '../public/afripulse-preview.html'];

test('every entry surface carries OpenGraph + Twitter preview meta on the brand domain', () => {
  for (const f of SURFACES) {
    const html = read(f);
    assert.match(html, /property="og:image" content="https:\/\/afripulsetimes\.com\//, `${f}: og:image`);
    assert.match(html, /property="og:title"/, `${f}: og:title`);
    assert.match(html, /name="twitter:card" content="summary_large_image"/, `${f}: twitter:card`);
    assert.ok(!/afri-pulse-times\.vercel\.app/.test(html.match(/property="og:[^>]+>/g)?.join('') ?? ''),
      `${f}: og tags must not point at the old vercel.app domain`);
  }
});

test('the shared preview card image is committed', () => {
  assert.ok(existsSync(p('../public/images/og-card.jpg')), 'public/images/og-card.jpg missing');
});

test('robots.txt allows crawling and names the sitemap', () => {
  const robots = read('../public/robots.txt');
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Disallow: \/api\//);
  assert.match(robots, /Sitemap: https:\/\/afripulsetimes\.com\/sitemap\.xml/);
});

test('sitemap.xml is well-formed enough and lists the homepage', () => {
  const sm = read('../public/sitemap.xml');
  assert.match(sm, /<urlset[^>]+sitemaps\.org/);
  assert.match(sm, /<loc>https:\/\/afripulsetimes\.com\/<\/loc>/);
  const opens = (sm.match(/<url>/g) || []).length;
  const closes = (sm.match(/<\/url>/g) || []).length;
  assert.equal(opens, closes, 'unbalanced <url> entries');
});

test('vercel.json sets the security headers on every route', () => {
  const vercel = JSON.parse(read('../vercel.json'));
  const all = (vercel.headers || []).find((h) => h.source === '/(.*)');
  assert.ok(all, 'missing catch-all headers block');
  const keys = all.headers.map((h) => h.key);
  for (const k of ['X-Content-Type-Options', 'Referrer-Policy', 'X-Frame-Options',
    'Permissions-Policy', 'Strict-Transport-Security']) {
    assert.ok(keys.includes(k), `missing ${k}`);
  }
});

test('reader JSON-LD declares the news organization', () => {
  const html = read('../public/reader.html');
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(m, 'JSON-LD block missing');
  const ld = JSON.parse(m[1]);
  assert.equal(ld['@type'], 'NewsMediaOrganization');
  assert.equal(ld.url, 'https://afripulsetimes.com');
  assert.deepEqual(ld.knowsLanguage, ['en', 'fr', 'ar', 'sw', 'pt']);
});
