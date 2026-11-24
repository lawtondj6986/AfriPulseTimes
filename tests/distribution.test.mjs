// Per-story share pages (/s/<slug>) and the RSS feed (/feed.xml): the pure
// composition helpers behind both distribution endpoints.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, articleFromRow, pickImage, buildShareHtml } from '../api/story-share.js';
import { xmlEscape, rfc822, feedItemFromRow, buildRss } from '../api/feed.js';

const ROW = {
  slug: 'kano-floods',
  headline: 'Kano counts the cost of the floods',
  dek: null,
  hero_image: null,
  published_at: '2026-11-20T08:00:00Z',
  payload: { standfirst: 'Thousands displaced as the river burst its banks.', hero_image: null }
};

// ── story-share ───────────────────────────────────────────────
test('articleFromRow prefers typed columns, falls back to payload, then defaults', () => {
  const a = articleFromRow(ROW);
  assert.equal(a.headline, 'Kano counts the cost of the floods');
  assert.equal(a.description, 'Thousands displaced as the river burst its banks.');
  const bare = articleFromRow({ slug: 'x', payload: null });
  assert.equal(bare.headline, 'AfriPulse Times');
  assert.match(bare.description, /54 African nations/);
});

test('pickImage: absolute https kept, site-relative resolved, fallback to og-card', () => {
  assert.equal(pickImage({ image: 'https://cdn.x/y.jpg' }, 'https://s'), 'https://cdn.x/y.jpg');
  assert.equal(pickImage({ image: '/images/a.jpg' }, 'https://s'), 'https://s/images/a.jpg');
  assert.equal(pickImage({ image: null }, 'https://s'), 'https://s/images/og-card.jpg');
  // http:// (insecure) is not trusted into the card
  assert.equal(pickImage({ image: 'http://cdn.x/y.jpg' }, 'https://s'), 'https://s/images/og-card.jpg');
});

test('buildShareHtml carries per-story OG meta and the reader redirect', () => {
  const html = buildShareHtml(articleFromRow(ROW), 'https://afripulsetimes.com');
  assert.match(html, /<meta property="og:title" content="Kano counts the cost of the floods">/);
  assert.match(html, /<meta property="og:description" content="Thousands displaced as the river burst its banks\.">/);
  assert.match(html, /og:url" content="https:\/\/afripulsetimes\.com\/s\/kano-floods"/);
  assert.match(html, /og:image" content="https:\/\/afripulsetimes\.com\/og\/kano-floods\.png"/);
  assert.match(html, /og:image:width" content="1200"/);
  assert.match(html, /article:published_time" content="2026-11-20T08:00:00Z"/);
  assert.match(html, /location\.replace\("\/#\/story\/kano-floods"\)/);
  assert.match(html, /http-equiv="refresh" content="0; url=\/#\/story\/kano-floods"/);
});

test('buildShareHtml escapes hostile article fields (no tag/attr injection)', () => {
  const evil = articleFromRow({
    slug: 'x',
    headline: '<script>alert(1)</script>',
    payload: { standfirst: '" onmouseover="steal()' }
  });
  const html = buildShareHtml(evil, 'https://s');
  assert.ok(!html.includes('<script>alert'), 'headline must be escaped');
  assert.ok(!/content=""\s+onmouseover/.test(html), 'description must not break out of the attribute');
  assert.match(html, /&lt;script&gt;/);
});

test('escapeHtml covers the five specials and tolerates null', () => {
  assert.equal(escapeHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
  assert.equal(escapeHtml(null), '');
});

// ── feed ──────────────────────────────────────────────────────
test('buildRss is a valid-shaped RSS 2.0 channel with /s/ item links', () => {
  const items = [ROW, { slug: 'b', headline: 'B', vertical: 'tech', payload: {}, published_at: '2026-11-19T10:00:00Z' }].map(feedItemFromRow);
  const xml = buildRss(items, 'https://afripulsetimes.com');
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<rss version="2\.0"/);
  assert.match(xml, /<link>https:\/\/afripulsetimes\.com\/s\/kano-floods<\/link>/);
  assert.match(xml, /<guid isPermaLink="true">https:\/\/afripulsetimes\.com\/s\/b<\/guid>/);
  assert.equal((xml.match(/<item>/g) || []).length, 2);
  assert.equal((xml.match(/<\/item>/g) || []).length, 2);
  assert.match(xml, /atom:link href="https:\/\/afripulsetimes\.com\/feed\.xml" rel="self"/);
});

test('feed item dates render RFC-822 and bad dates fall back safely', () => {
  assert.match(rfc822('2026-11-20T08:00:00Z'), /Fri, 20 Nov 2026 08:00:00 GMT/);
  assert.match(rfc822('not-a-date'), /GMT$/);
  assert.match(rfc822(null), /GMT$/);
});

test('feed escapes hostile titles so the XML stays well-formed', () => {
  const xml = buildRss([feedItemFromRow({ slug: 'x', headline: 'Cocoa & gold <surge>', payload: {} })], 'https://s');
  assert.match(xml, /<title>Cocoa &amp; gold &lt;surge&gt;<\/title>/);
  assert.ok(!xml.includes('<surge>'));
});

test('xmlEscape covers the five specials', () => {
  assert.equal(xmlEscape(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
});

// ── search-engine readiness: NewsArticle data, full text, news sitemap ──
import { buildJsonLd } from '../api/story-share.js';
import { buildSitemap, isoOrNull } from '../api/sitemap.js';

test('story page carries NewsArticle JSON-LD and the full article text', () => {
  const a = articleFromRow({
    slug: 'kano-floods', headline: 'Kano floods displace thousands', vertical: 'front',
    published_at: '2026-11-24T08:00:00Z',
    payload: { standfirst: 'Rivers burst their banks.', byline: 'Amina Yusuf', body: ['First para.', 'Second para.'] }
  });
  const ld = JSON.parse(buildJsonLd(a, 'https://x.test'));
  assert.equal(ld['@type'], 'NewsArticle');
  assert.equal(ld.url, 'https://x.test/s/kano-floods');
  assert.equal(ld.datePublished, '2026-11-24T08:00:00Z');
  assert.equal(ld.author.name, 'Amina Yusuf');
  assert.equal(ld.publisher.name, 'AfriPulse Times');
  assert.equal(ld.articleSection, 'front');
  assert.match(ld.articleBody, /First para\.\n\nSecond para\./);
  const html = buildShareHtml(a, 'https://x.test');
  assert.match(html, /<script type="application\/ld\+json">/);
  assert.match(html, /<p>First para\.<\/p>\n<p>Second para\.<\/p>/);
  assert.match(html, /location\.replace\("\/#\/story\/kano-floods"\)/, 'people are still forwarded to the reader');
});

test('wire stories keep their attribution in markup and structured data', () => {
  const a = articleFromRow({ slug: 'w1', headline: 'H', payload: {
    body: ['B'], source: 'rss', sourceUrl: 'https://wire.example/a', sourceLabel: 'Wire Co' } });
  const ld = JSON.parse(buildJsonLd(a, 'https://x.test'));
  assert.equal(ld.author.name, 'Wire Co');
  assert.equal(ld.isBasedOn, 'https://wire.example/a');
  assert.match(buildShareHtml(a, 'https://x.test'), /Source: <a rel="nofollow noopener" href="https:\/\/wire\.example\/a">Wire Co<\/a>/);
  // a non-http source URL is never emitted as a link
  const bad = articleFromRow({ slug: 'w2', headline: 'H', payload: { source: 'rss', sourceUrl: 'javascript:alert(1)' } });
  assert.equal(bad.sourceUrl, null);
});

test('article text can never break out of the JSON-LD script element', () => {
  const a = articleFromRow({ slug: 'x', headline: 'A </script><script>alert(1)</script>', payload: { body: ['</script>'] } });
  const raw = buildJsonLd(a, 'https://x.test');
  assert.ok(!raw.includes('<'), 'no raw < inside the JSON-LD payload');
  assert.equal(JSON.parse(raw).headline, 'A </script><script>alert(1)</script>');
});

test('news sitemap lists every story and tags only the last 48 hours for Google News', () => {
  const now = Date.parse('2026-11-24T12:00:00Z');
  const xml = buildSitemap([
    { slug: 'fresh-one', headline: 'Fresh & new', published_at: '2026-11-24T06:00:00Z' },
    { slug: 'old-one', headline: 'Old', published_at: '2026-11-10T06:00:00Z' },
    { slug: '', headline: 'no slug' }
  ], 'https://x.test/', now);
  assert.match(xml, /<loc>https:\/\/x\.test\/s\/fresh-one<\/loc>/);
  assert.match(xml, /<loc>https:\/\/x\.test\/s\/old-one<\/loc>/);
  assert.equal((xml.match(/<news:news>/g) || []).length, 1, 'only the fresh story is a news item');
  assert.match(xml, /<news:title>Fresh &amp; new<\/news:title>/);
  assert.equal((xml.match(/<url>/g) || []).length, 3, 'home + two stories; slugless row dropped');
  assert.equal(isoOrNull('not a date'), null);
});

test('news sitemap is wired into vercel.json and robots.txt', async () => {
  const { readFileSync } = await import('node:fs');
  const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.ok(vercel.rewrites.some((r) => r.source === '/sitemap-news.xml' && r.destination === '/api/sitemap'));
  assert.match(readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8'), /sitemap-news\.xml/);
});

// ── wire hygiene ──────────────────────────────────────────────
import { stripWireTag } from '../api/story-share.js';

test('wire tags are stripped and the summary is never repeated as the body', () => {
  assert.equal(stripWireTag('[DW] The boat overturned.'), 'The boat overturned.');
  assert.equal(stripWireTag('No tag here [really].'), 'No tag here [really].');
  const a = articleFromRow({ slug: 'w', headline: 'H', payload: {
    standfirst: '[DW] The boat overturned.', body: ['[DW] The boat overturned.', 'A second, different paragraph.'],
    source: 'rss', sourceUrl: 'https://wire.example/a', sourceLabel: 'AllAfrica' } });
  assert.equal(a.description, 'The boat overturned.');
  assert.equal(JSON.stringify(a.body), JSON.stringify(['A second, different paragraph.']));
  const html = buildShareHtml(a, 'https://x.test');
  assert.ok(!html.includes('[DW]'), 'no raw tag anywhere on the page');
  assert.equal(feedItemFromRow({ slug: 'w', payload: { standfirst: '[RFI] Talks resume.' } }).description, 'Talks resume.');
});

// ── per-story share images ────────────────────────────────────
import { ogElement, headlineSize, clipHeadline, sectionLabel } from '../api/og.js';

test('stories without a photo get their own generated share image', () => {
  assert.equal(pickImage({ slug: 'kano-floods', image: null }, 'https://s'), 'https://s/og/kano-floods.png');
  assert.equal(pickImage({ slug: 'kano-floods', image: 'https://cdn.x/y.jpg' }, 'https://s'), 'https://cdn.x/y.jpg', 'a real photo still wins');
  assert.equal(pickImage({ slug: 'Bad Slug!', image: null }, 'https://s'), 'https://s/images/og-card.jpg', 'unsafe slug falls back');
});

test('share card: headline sizing, clipping and section labels', () => {
  assert.equal(headlineSize('Short headline'), 76);
  assert.ok(headlineSize('x'.repeat(140)) < headlineSize('x'.repeat(60)), 'long headlines shrink');
  const long = clipHeadline('word '.repeat(60));
  assert.ok(long.length <= 150 && long.endsWith('…'));
  assert.equal(clipHeadline('  Two   spaces  '), 'Two spaces');
  assert.equal(sectionLabel('markets'), 'Business & Markets');
  assert.equal(sectionLabel('unknown'), 'AfriPulse Times');
  const text = JSON.stringify(ogElement({ headline: 'Kano floods', vertical: 'front', published_at: '2026-11-24T08:00:00Z' }));
  assert.match(text, /Kano floods/); assert.match(text, /Front Page/); assert.match(text, /2026-11-24/);
  assert.match(text, /afripulsetimes\.com/);
});

test('share image route is wired in vercel.json', async () => {
  const { readFileSync } = await import('node:fs');
  const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.ok(vercel.rewrites.some((r) => r.source === '/og/:slug' && r.destination === '/api/og?slug=:slug'));
});
