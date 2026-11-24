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
  assert.ok(!/http-equiv="refresh"/.test(html), 'no meta refresh: it would bounce no-JS readers into the app');
  assert.match(html, /<a href="\/today">More of today’s stories<\/a>/);
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
  assert.equal((xml.match(/<url>/g) || []).length, 4, 'home + /today + two stories; slugless row dropped');
  assert.match(xml, /<loc>https:\/\/x\.test\/today<\/loc>/);
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

// ── image URLs from feeds ─────────────────────────────────────
import { extractImage } from '../api/pull-wire.js';

test('feed image URLs are stored and served without HTML entity encoding', () => {
  const got = extractImage({ content: '<p><img src="http://i0.wp.com/x/y.png?fit=700%2C412&amp;ssl=1"></p>' });
  assert.equal(got, 'https://i0.wp.com/x/y.png?fit=700%2C412&ssl=1');
  // rows ingested before the fix are repaired on the way out
  const a = articleFromRow({ slug: 's', headline: 'H', hero_image: 'https://i0.wp.com/x/y.png?fit=1&amp;ssl=1' });
  assert.equal(a.image, 'https://i0.wp.com/x/y.png?fit=1&ssl=1');
  const html = buildShareHtml(a, 'https://x.test');
  assert.match(html, /og:image" content="https:\/\/i0\.wp\.com\/x\/y\.png\?fit=1&amp;ssl=1"/, 'escaped exactly once in markup');
  assert.equal(articleFromRow({ slug: 's', headline: 'H' }).image, null);
});

// ── the plain-HTML edition (/today) ───────────────────────────
import { buildFrontHtml, frontItemFromRow } from '../api/front.js';

test('plain front page: sectioned headlines linking to full-text story pages, no scripts to run', () => {
  const items = [
    { slug: 'kano-floods', headline: 'Kano floods <displace> thousands', vertical: 'front', published_at: '2026-11-24T08:00:00Z',
      payload: { standfirst: '[DW] Rivers burst their banks.' } },
    { slug: 'lagos-rally', headline: 'Lagos markets rally', vertical: 'markets', published_at: '2026-11-24T07:00:00Z', payload: {} },
    { slug: 'op-1', headline: 'An opinion', vertical: 'voices', payload: {} },
    { slug: 'weird', headline: 'Unknown section', vertical: 'astrology', payload: {} },
    { slug: '', headline: 'no slug' }
  ].map(frontItemFromRow);
  const html = buildFrontHtml(items, 'https://x.test', Date.parse('2026-11-24T12:00:00Z'));
  assert.match(html, /<h2>Front Page<\/h2>/);
  assert.match(html, /<h2>Business &amp; Markets<\/h2>/);
  assert.match(html, /<h2>Opinions<\/h2>/, 'legacy "voices" maps to Opinions');
  assert.match(html, /<a href="\/s\/kano-floods">Kano floods &lt;displace&gt; thousands<\/a>/, 'escaped, linked to the story page');
  assert.match(html, /<p>Rivers burst their banks\.<\/p>/, 'wire tag stripped');
  assert.match(html, /Unknown section/, 'an unrecognised section still appears (under Front Page)');
  assert.ok(!html.includes('no slug'));
  assert.ok(html.indexOf('Front Page') < html.indexOf('Business &amp; Markets'), 'sections in the paper’s order');
  assert.match(html, /<link rel="canonical" href="https:\/\/x\.test\/today">/);
  assert.match(html, /2026-11-24 · plain, fast version/);
  // the only script element is inert structured data
  const scripts = html.match(/<script[^>]*>/g) || [];
  assert.equal(scripts.length, 1);
  assert.match(scripts[0], /application\/ld\+json/);
  const ld = JSON.parse(html.slice(html.indexOf('ld+json">') + 9, html.indexOf('</script>')));
  assert.equal(ld['@type'], 'ItemList');
  assert.equal(ld.itemListElement[0].url, 'https://x.test/s/kano-floods');
  assert.ok(!/<img|<link rel="stylesheet"/.test(html), 'no images or external styles');
});

test('plain front page with no stories still renders a page', () => {
  const html = buildFrontHtml([], 'https://x.test');
  assert.match(html, /The newsroom is filing/);
  assert.match(html, /<a href="\/">Full edition \(app\)<\/a>/);
});

test('no-JavaScript visitors are routed to the plain edition', async () => {
  const { readFileSync } = await import('node:fs');
  const rd = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
  const vercel = JSON.parse(rd('../vercel.json'));
  assert.ok(vercel.rewrites.some((r) => r.source === '/today' && r.destination === '/api/front'));
  assert.match(rd('../index.html'), /<noscript><meta http-equiv="refresh" content="0; url=\/today"><\/noscript>/);
  assert.match(rd('../public/reader.html'), /<noscript>[\s\S]*href="\/today"[\s\S]*<\/noscript>/);
});

// ── edition quality on the public pages ───────────────────────
import { isJunkSummary } from '../api/story-share.js';

test('junk summaries never reach a story page or the plain edition', () => {
  const css = '/* Scoped resets */.tc-daily-wrapper * { box-sizing: border-box; }';
  const a = articleFromRow({ slug: 'next-wave', headline: 'The Next Wave: instant payments', payload: { standfirst: css, body: [css, 'A real paragraph.', 'Short.'] } });
  assert.equal(a.description, 'Real-time, editor-verified news from all 54 African nations.', 'falls back to the site description');
  assert.equal(JSON.stringify(a.body), JSON.stringify(['A real paragraph.', 'Short.']), 'junk paragraph dropped; a short real one kept');
  const html = buildShareHtml(a, 'https://x.test');
  assert.ok(!html.includes('box-sizing'));
  assert.ok(!/<p class="d">/.test(html), 'the generic description is not printed as if it were the standfirst');
  assert.ok(isJunkSummary('In partnership with', 'H'));
  assert.ok(isJunkSummary('Same headline here ok', 'Same headline here ok'));
  assert.ok(!isJunkSummary('Rescuers search for 30 people still missing.', 'Indonesia fire'));
});

test('plain edition files wire stories with the current classifier and keeps world news in World', () => {
  const wire = (slug, headline, standfirst, vertical, label) => frontItemFromRow({ slug, headline, vertical, payload: { source: 'rss', standfirst, sourceLabel: label || 'Al Jazeera' } });
  // An African publisher's story is African even when it never names the country.
  assert.equal(wire('by', 'Bayelsa Boat Mishap: Death toll rises, Tinubu approves N250mn', 'The president approved funds for families.', 'politics', 'Premium Times').section, 'politics');
  assert.equal(wire('zb', 'Aradel, Zenith Bank, NASCON top stock pick this week', 'A stock investment guide.', 'markets', 'Premium Times').section, 'markets');
  // An international outlet's story that says "Africa" or uses a demonym is not world news.
  assert.notEqual(wire('af', 'Africa: COP31 cover deal collapses', 'Talks ended without agreement.', 'front', 'Al Jazeera').section, 'world');
  assert.notEqual(wire('nn', 'Aid group deepens support for vulnerable Nigerians', 'Two charities received donations.', 'front', 'Reuters').section, 'world');
  // stored as Markets by the old classifier ("frustrate" contains "rate"); not about Africa
  assert.equal(wire('nz', 'New Zealand’s Mitchell, Phillips frustrate India as first Test ends in draw', 'New Zealand rescued a draw.', 'markets').section, 'world');
  // stored as Culture ("counterpart" contains "art"); African → Politics
  assert.equal(wire('ke', 'Kenya: Ruto, Tshisekedi Agree to Restore Full Diplomatic Relations', 'The presidents agreed to restore diplomatic relations.', 'culture').section, 'politics');
  assert.equal(wire('ng', 'NPFL Roundup: Rivers, Barau record big wins in Lagos', 'Rivers United won.', 'politics').section, 'sports');
  assert.equal(wire('es', 'Who is Alberto Feijoo, the conservative seeking to become Spain’s new PM?', 'He hopes to win the elections.', 'culture').section, 'world');
  // original reporting keeps the section its editor gave it
  assert.equal(frontItemFromRow({ slug: 'own', headline: 'Our tennis special', vertical: 'culture', payload: {} }).section, 'culture');
  // junk summary dropped; long summary ends on a word with an ellipsis
  assert.equal(wire('tc', 'TechCabal Daily: Lagos fintech roundup', 'In partnership with', 'tech').dek, '');
  const long = wire('ml', 'Mali: campaign for detained trader', 'word '.repeat(80), 'front').dek;
  assert.ok(long.length <= 221 && long.endsWith('…') && !/\s…$/.test(long));
  const html = buildFrontHtml([wire('ke', 'Kenya signs accord with Uganda', 'The two governments signed.', 'culture'), wire('es', 'Spain votes in snap election', 'Polls opened.', 'front')], 'https://x.test');
  assert.ok(html.indexOf('<h2>Politics</h2>') < html.indexOf('<h2>World</h2>'), 'World comes last');
});

// ── headline hygiene ──────────────────────────────────────────
import { tidyHeadline, splitByline, isRoundup } from '../api/story-share.js';
import { correctionFor as correctWire } from '../api/pull-wire.js';

test('tidyHeadline cleans feed headlines without rewriting them', () => {
  assert.equal(tidyHeadline('👨🏿‍🚀TechCabal Daily – Dangote’s encore'), 'TechCabal Daily – Dangote’s encore');
  assert.equal(tidyHeadline('South Africa: South Africa Links to Global Traffickers Exposed'), 'South Africa Links to Global Traffickers Exposed');
  assert.equal(tidyHeadline('Nigeria: At least 24 Dead After Boat Capsizes'), 'Nigeria: At least 24 Dead After Boat Capsizes', 'a useful country prefix is kept');
  assert.equal(tidyHeadline('EDITORIAL: Sustaining the Flamingos’ flourish'), 'Editorial: Sustaining the Flamingos’ flourish');
  assert.equal(tidyHeadline('COP31: Nigeria absent at closing plenary'), 'COP31: Nigeria absent at closing plenary', 'acronyms are not labels');
  assert.equal(tidyHeadline('Township Businesses Struggle - South African News Briefs - November 23, 2026'), 'Township Businesses Struggle - South African News Briefs');
  assert.equal(tidyHeadline('  Two   spaces  here '), 'Two spaces here');
  assert.equal(tidyHeadline(null), '');
});

test('splitByline lifts a writer’s name out of the headline', () => {
  assert.deepEqual(splitByline('Makinde: Bride or side-chick?, By Wole Olaoye'), { headline: 'Makinde: Bride or side-chick?', by: 'Wole Olaoye' });
  assert.deepEqual(splitByline('Stand by your allies, minister says'), { headline: 'Stand by your allies, minister says', by: '' });
  const a = articleFromRow({ slug: 'op', headline: 'Makinde: Bride or side-chick?, By Wole Olaoye', payload: { byline: 'Premium Times' } });
  assert.equal(a.headline, 'Makinde: Bride or side-chick?');
  assert.equal(a.byline, 'Wole Olaoye');
  assert.match(buildShareHtml(a, 'https://x.test'), /<h1>Makinde: Bride or side-chick\?<\/h1>/);
});

test('isRoundup spots digests and newsletters', () => {
  assert.ok(isRoundup('TechCabal Daily – Dangote’s encore'));
  assert.ok(isRoundup('South African News Briefs'));
  assert.ok(isRoundup('NPFL Roundup: Rivers record big wins'));
  assert.ok(!isRoundup('Nigeria: At least 24 Dead After Boat Capsizes'));
});

test('public pages and the stored-story correction use the tidy headline', () => {
  assert.equal(feedItemFromRow({ slug: 's', headline: '👨🏿‍🚀TechCabal Daily – Dangote’s encore' }).title, 'TechCabal Daily – Dangote’s encore');
  assert.equal(frontItemFromRow({ slug: 's', headline: 'EDITORIAL: Sustaining the Flamingos’ flourish', payload: { source: 'rss', sourceLabel: 'Premium Times' } }).headline, 'Editorial: Sustaining the Flamingos’ flourish');
  // an opinion column keeps its byline in storage (it is what marks it as opinion) …
  const col = { headline: 'Makinde: Bride or side-chick?, By Wole Olaoye', vertical: 'opinions', payload: { source: 'rss', vertical: 'opinions', standfirst: 'A bride is a woman on her wedding day.' } };
  assert.equal(correctWire(col), null);
  // … while a messy stored headline is tidied, and stays filed where it was
  const patch = correctWire({ headline: 'South Africa: South Africa Links to Global Sky Traffickers Exposed', vertical: 'front', payload: { source: 'rss', vertical: 'front', headline: 'South Africa: South Africa Links to Global Sky Traffickers Exposed', standfirst: 'Authorities found cocaine at the scene of the crash.' } });
  assert.equal(patch.headline, 'South Africa Links to Global Sky Traffickers Exposed');
  assert.equal(patch.payload.headline, patch.headline);
  assert.equal(patch.vertical, 'front');
});
