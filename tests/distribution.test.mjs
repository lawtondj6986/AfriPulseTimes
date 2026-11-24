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
  assert.match(html, /og:image" content="https:\/\/afripulsetimes\.com\/images\/og-card\.jpg"/);
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
